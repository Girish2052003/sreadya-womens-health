package postgres

import (
	"bytes"
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"

	"sreadya.dev/sync_service/internal/devices"
	sreadyasync "sreadya.dev/sync_service/internal/sync"
)

type fakeRow func(...any) error

func (f fakeRow) Scan(dest ...any) error { return f(dest...) }

type fakeRows struct {
	scans []func(...any) error
	index int
	err   error
}

func (r *fakeRows) Next() bool {
	if r.index >= len(r.scans) {
		return false
	}
	r.index++
	return true
}

func (r *fakeRows) Scan(dest ...any) error { return r.scans[r.index-1](dest...) }
func (r *fakeRows) Err() error             { return r.err }
func (r *fakeRows) Close()                 {}

type fakeDatabase struct {
	queryRow func(context.Context, string, ...any) rowScanner
	query    func(context.Context, string, ...any) (rowsScanner, error)
	begin    func(context.Context) (transaction, error)
}

func (d fakeDatabase) QueryRow(ctx context.Context, sql string, args ...any) rowScanner {
	return d.queryRow(ctx, sql, args...)
}

func (d fakeDatabase) Query(ctx context.Context, sql string, args ...any) (rowsScanner, error) {
	return d.query(ctx, sql, args...)
}

func (d fakeDatabase) Begin(ctx context.Context) (transaction, error) {
	return d.begin(ctx)
}

type fakeTransaction struct {
	queryRow      func(context.Context, string, ...any) rowScanner
	exec          func(context.Context, string, ...any) error
	commitCalls   int
	rollbackCalls int
}

func (tx *fakeTransaction) QueryRow(ctx context.Context, sql string, args ...any) rowScanner {
	return tx.queryRow(ctx, sql, args...)
}

func (tx *fakeTransaction) Exec(ctx context.Context, sql string, args ...any) error {
	return tx.exec(ctx, sql, args...)
}

func (tx *fakeTransaction) Commit(context.Context) error {
	tx.commitCalls++
	return nil
}

func (tx *fakeTransaction) Rollback(context.Context) error {
	tx.rollbackCalls++
	return nil
}

func TestTask22CursorCodecIsOpaqueAndVersioned(t *testing.T) {
	cursor := encodeCursor(42)
	if cursor == "42" || !strings.HasPrefix(cursor, "v1.") {
		t.Fatalf("cursor %q must be opaque and versioned", cursor)
	}
	sequence, err := decodeCursor(cursor)
	if err != nil {
		t.Fatal(err)
	}
	if sequence != 42 {
		t.Fatalf("decoded sequence=%d, want 42", sequence)
	}
	sequence, err = decodeCursor("")
	if err != nil || sequence != 0 {
		t.Fatalf("initial empty cursor decoded to %d, %v; want 0, nil", sequence, err)
	}
	for _, malformed := range []string{"42", "v2.AAAAAAAAACo", "v1.not-base64", "v1.AQ"} {
		if _, err := decodeCursor(malformed); !errors.Is(err, sreadyasync.ErrInvalidCursor) {
			t.Fatalf("decodeCursor(%q) error=%v, want ErrInvalidCursor", malformed, err)
		}
	}
}

func TestTask22DeviceLookupMapsDatabaseState(t *testing.T) {
	store := &Store{db: fakeDatabase{
		queryRow: func(_ context.Context, sql string, args ...any) rowScanner {
			if !strings.Contains(sql, "FROM devices") || len(args) != 1 || args[0] != "dev-a" {
				t.Fatalf("unexpected device query sql=%q args=%v", sql, args)
			}
			return fakeRow(func(dest ...any) error {
				*(dest[0].(*string)) = "acct-a"
				*(dest[1].(*string)) = "active"
				return nil
			})
		},
	}}

	record, err := store.Device(context.Background(), "dev-a")
	if err != nil {
		t.Fatal(err)
	}
	if record != (devices.Record{DeviceID: "dev-a", AccountID: "acct-a", State: devices.StateActive}) {
		t.Fatalf("device record=%+v", record)
	}
}

func TestTask22DeviceLookupMapsNoRowsToNotFound(t *testing.T) {
	store := &Store{db: fakeDatabase{
		queryRow: func(context.Context, string, ...any) rowScanner {
			return fakeRow(func(...any) error { return pgx.ErrNoRows })
		},
	}}
	_, err := store.Device(context.Background(), "missing")
	if !errors.Is(err, devices.ErrDeviceNotFound) {
		t.Fatalf("missing device error=%v, want ErrDeviceNotFound", err)
	}
}

func TestTask22VaultAccountReadsOwnershipOnly(t *testing.T) {
	store := &Store{db: fakeDatabase{
		queryRow: func(_ context.Context, sql string, args ...any) rowScanner {
			if !strings.Contains(sql, "FROM vaults") || strings.Contains(strings.ToLower(sql), "ciphertext") {
				t.Fatalf("vault ownership query is not minimal: %q", sql)
			}
			return fakeRow(func(dest ...any) error {
				*(dest[0].(*string)) = "acct-a"
				return nil
			})
		},
	}}
	accountID, err := store.VaultAccount(context.Background(), "vault-a")
	if err != nil {
		t.Fatal(err)
	}
	if accountID != "acct-a" {
		t.Fatalf("accountID=%q, want acct-a", accountID)
	}
}

func TestTask22EventsAfterUsesServerSequenceAndPreservesOpaqueEnvelope(t *testing.T) {
	createdAt := time.Date(2026, 9, 17, 2, 0, 0, 0, time.UTC)
	ciphertext := []byte("opaque-ciphertext")
	digest := bytes.Repeat([]byte{0x33}, 32)
	cursor := encodeCursor(7)
	var querySQL string
	var queryArgs []any
	store := &Store{db: fakeDatabase{
		query: func(_ context.Context, sql string, args ...any) (rowsScanner, error) {
			querySQL = sql
			queryArgs = append([]any(nil), args...)
			return &fakeRows{scans: []func(...any) error{
				func(dest ...any) error {
					*(dest[0].(*string)) = "acct-a"
					*(dest[1].(*string)) = "vault-a"
					*(dest[2].(*string)) = "evt-8"
					*(dest[3].(*string)) = "obj-a"
					*(dest[4].(*string)) = "dev-a"
					*(dest[5].(*int64)) = 1
					*(dest[6].(*int64)) = 1
					*(dest[7].(*string)) = "SREADYA-E2EE-V1-ED25519"
					*(dest[8].(*string)) = "opaque-schema-v1"
					*(dest[9].(*int64)) = 0
					*(dest[10].(*string)) = "upsert"
					*(dest[11].(*[]byte)) = bytes.Repeat([]byte{0x11}, 32)
					*(dest[12].(*[]byte)) = bytes.Repeat([]byte{0x22}, 12)
					*(dest[13].(*[]byte)) = append([]byte(nil), ciphertext...)
					*(dest[14].(*[]byte)) = append([]byte(nil), digest...)
					*(dest[15].(*time.Time)) = createdAt
					*(dest[16].(*int64)) = 1
					*(dest[17].(*bool)) = false
					*(dest[18].(*int64)) = 8
					return nil
				},
			}}, nil
		},
	}}

	page, err := store.EventsAfter(context.Background(), "vault-a", cursor, 25)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(querySQL, "server_sequence >") || !strings.Contains(querySQL, "ORDER BY") || !strings.Contains(querySQL, "server_sequence") {
		t.Fatalf("pull query does not use server_sequence ordering: %q", querySQL)
	}
	if len(queryArgs) != 3 || queryArgs[0] != "vault-a" || queryArgs[1] != int64(7) || queryArgs[2] != 25 {
		t.Fatalf("pull args=%v", queryArgs)
	}
	if len(page.Events) != 1 || page.Events[0].Envelope.AccountID != "acct-a" || !bytes.Equal(page.Events[0].Envelope.CiphertextAndTag, ciphertext) {
		t.Fatalf("page events=%+v", page.Events)
	}
	if page.Events[0].CommittedRevision != 1 || page.Events[0].Conflict || !page.Events[0].Envelope.CreatedAt.Equal(createdAt) {
		t.Fatalf("stored event changed=%+v", page.Events[0])
	}
	if page.NextCursor != encodeCursor(8) {
		t.Fatalf("next cursor=%q, want %q", page.NextCursor, encodeCursor(8))
	}
}

func TestTask22CommitEnvelopeLocksVaultAndAllocatesRevisionInOneTransaction(t *testing.T) {
	var sawVaultLock, sawExistingLookup, sawRevisionLookup bool
	var insertSQL string
	var insertArgs []any
	tx := &fakeTransaction{}
	tx.queryRow = func(_ context.Context, sql string, args ...any) rowScanner {
		switch {
		case strings.Contains(sql, "FROM vaults") && strings.Contains(sql, "FOR UPDATE"):
			sawVaultLock = true
			return fakeRow(func(dest ...any) error {
				*(dest[0].(*string)) = "acct-a"
				return nil
			})
		case strings.Contains(sql, "event_id") && strings.Contains(sql, "FROM sync_events"):
			sawExistingLookup = true
			return fakeRow(func(...any) error { return pgx.ErrNoRows })
		case strings.Contains(sql, "MAX(committed_revision)"):
			sawRevisionLookup = true
			return fakeRow(func(dest ...any) error {
				*(dest[0].(*int64)) = 12
				return nil
			})
		default:
			t.Fatalf("unexpected transaction query: %q args=%v", sql, args)
			return fakeRow(func(...any) error { return errors.New("unexpected query") })
		}
	}
	tx.exec = func(_ context.Context, sql string, args ...any) error {
		insertSQL = sql
		insertArgs = append([]any(nil), args...)
		return nil
	}
	store := &Store{db: fakeDatabase{
		begin: func(context.Context) (transaction, error) { return tx, nil },
	}}
	envelope := sreadyasync.Envelope{
		AccountID:        "acct-a",
		VaultID:          "vault-a",
		EventID:          "evt-13",
		ObjectID:         "obj-a",
		SourceDeviceID:   "dev-a",
		KeyEpoch:         1,
		ProtocolVersion:  1,
		SuiteID:          "SREADYA-E2EE-V1-ED25519",
		SchemaID:         "opaque-schema-v1",
		BaseRevision:     8,
		Operation:        "upsert",
		KDFSalt:          bytes.Repeat([]byte{0x11}, 32),
		Nonce:            bytes.Repeat([]byte{0x22}, 12),
		CiphertextAndTag: []byte("opaque-ciphertext"),
		EnvelopeDigest:   bytes.Repeat([]byte{0x33}, 32),
		CreatedAt:        time.Date(2026, 9, 17, 2, 0, 0, 0, time.UTC),
	}

	ack, err := store.CommitEnvelope(context.Background(), envelope)
	if err != nil {
		t.Fatal(err)
	}
	if !sawVaultLock || !sawExistingLookup || !sawRevisionLookup {
		t.Fatalf("transaction steps lock=%v existing=%v revision=%v", sawVaultLock, sawExistingLookup, sawRevisionLookup)
	}
	if ack.EventID != "evt-13" || ack.CommittedRevision != 13 || !ack.Conflict || ack.Existing {
		t.Fatalf("ack=%+v", ack)
	}
	if !strings.Contains(insertSQL, "INSERT INTO sync_events") || strings.Contains(insertSQL, "server_sequence") {
		t.Fatalf("insert must let PostgreSQL generate server_sequence: %q", insertSQL)
	}
	if len(insertArgs) == 0 {
		t.Fatal("insert received no envelope arguments")
	}
	if tx.commitCalls != 1 {
		t.Fatalf("commit calls=%d, want 1", tx.commitCalls)
	}
}

func TestTask22CommitEnvelopeReturnsEquivalentExistingEventIdempotently(t *testing.T) {
	digest := bytes.Repeat([]byte{0x33}, 32)
	tx := &fakeTransaction{}
	tx.queryRow = func(_ context.Context, sql string, _ ...any) rowScanner {
		switch {
		case strings.Contains(sql, "FROM vaults") && strings.Contains(sql, "FOR UPDATE"):
			return fakeRow(func(dest ...any) error {
				*(dest[0].(*string)) = "acct-a"
				return nil
			})
		case strings.Contains(sql, "event_id") && strings.Contains(sql, "FROM sync_events"):
			return fakeRow(func(dest ...any) error {
				*(dest[0].(*[]byte)) = append([]byte(nil), digest...)
				*(dest[1].(*int64)) = 7
				*(dest[2].(*bool)) = true
				return nil
			})
		default:
			t.Fatalf("unexpected transaction query %q", sql)
			return fakeRow(func(...any) error { return errors.New("unexpected query") })
		}
	}
	tx.exec = func(context.Context, string, ...any) error {
		t.Fatal("idempotent retry must not insert")
		return nil
	}
	store := &Store{db: fakeDatabase{begin: func(context.Context) (transaction, error) { return tx, nil }}}
	envelope := sreadyasync.Envelope{VaultID: "vault-a", EventID: "evt-7", EnvelopeDigest: digest}

	ack, err := store.CommitEnvelope(context.Background(), envelope)
	if err != nil {
		t.Fatal(err)
	}
	if !ack.Existing || ack.EventID != "evt-7" || ack.CommittedRevision != 7 || !ack.Conflict {
		t.Fatalf("existing ack=%+v", ack)
	}
	if tx.commitCalls != 0 {
		t.Fatalf("idempotent retry unexpectedly committed transaction %d times", tx.commitCalls)
	}
}
