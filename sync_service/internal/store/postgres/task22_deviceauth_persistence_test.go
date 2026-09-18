package postgres

import (
	"bytes"
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"

	"sreadya.dev/sync_service/internal/deviceauth"
	"sreadya.dev/sync_service/internal/devices"
)

var _ deviceauth.ChallengeStore = (*Store)(nil)

func TestTask22DeviceLookupReturnsStoredSigningIdentity(t *testing.T) {
	keyBytes := bytes.Repeat([]byte{0x42}, 32)
	store := &Store{db: fakeDatabase{
		queryRow: func(_ context.Context, sql string, args ...any) rowScanner {
			if !strings.Contains(sql, "public_signing_key") || !strings.Contains(sql, "signature_suite") {
				t.Fatalf("device signing identity missing from query: %q", sql)
			}
			if len(args) != 1 || args[0] != "dev-a" {
				t.Fatalf("unexpected device args=%v", args)
			}
			return fakeRow(func(dest ...any) error {
				*(dest[0].(*string)) = "acct-a"
				*(dest[1].(*string)) = "active"
				*(dest[2].(*[]byte)) = append([]byte(nil), keyBytes...)
				*(dest[3].(*string)) = "Ed25519"
				return nil
			})
		},
	}}

	record, err := store.Device(context.Background(), "dev-a")
	if err != nil {
		t.Fatal(err)
	}
	var wantKey [32]byte
	copy(wantKey[:], keyBytes)
	want := devices.Record{
		DeviceID:         "dev-a",
		AccountID:        "acct-a",
		State:            devices.StateActive,
		PublicSigningKey: wantKey,
		SignatureSuite:   "Ed25519",
	}
	if record != want {
		t.Fatalf("device record=%+v want=%+v", record, want)
	}
}

func TestTask22ChallengePutPersistsOnlyAuthorizationScope(t *testing.T) {
	tx := &fakeTransaction{}
	var insertSQL string
	var insertArgs []any
	tx.queryRow = func(context.Context, string, ...any) rowScanner {
		return fakeRow(func(...any) error { return errors.New("unexpected query") })
	}
	tx.exec = func(_ context.Context, sql string, args ...any) error {
		insertSQL = sql
		insertArgs = append([]any(nil), args...)
		return nil
	}
	store := &Store{db: fakeDatabase{
		begin: func(context.Context) (transaction, error) { return tx, nil },
	}}
	expiresAt := time.Date(2026, 9, 17, 3, 0, 0, 0, time.UTC)
	bodyDigest := bytes.Repeat([]byte{0x7a}, 32)
	challenge := deviceauth.Challenge{
		Value: "challenge-a",
		Scope: deviceauth.Scope{
			AccountID:  "acct-a",
			DeviceID:   "dev-a",
			Action:     "sync.push",
			Method:     "POST",
			Path:       "/v1/sync/push",
			BodySHA256: bodyDigest,
		},
		ExpiresAt: expiresAt,
	}

	if err := store.Put(context.Background(), challenge); err != nil {
		t.Fatal(err)
	}
	lowerSQL := strings.ToLower(insertSQL)
	if !strings.Contains(lowerSQL, "insert into device_challenges") || strings.Contains(lowerSQL, "ciphertext") {
		t.Fatalf("challenge insert is not authorization-only: %q", insertSQL)
	}
	if len(insertArgs) != 8 || insertArgs[0] != "challenge-a" || insertArgs[1] != "acct-a" || insertArgs[2] != "dev-a" || insertArgs[3] != "sync.push" || insertArgs[4] != "POST" || insertArgs[5] != "/v1/sync/push" || !bytes.Equal(insertArgs[6].([]byte), bodyDigest) || insertArgs[7] != expiresAt {
		t.Fatalf("challenge insert args=%v", insertArgs)
	}
	if tx.commitCalls != 1 {
		t.Fatalf("challenge insert commit calls=%d, want 1", tx.commitCalls)
	}
}

func TestTask22ChallengeConsumeIsOneAtomicUpdateReturning(t *testing.T) {
	expiresAt := time.Date(2026, 9, 17, 3, 0, 0, 0, time.UTC)
	bodyDigest := bytes.Repeat([]byte{0x6b}, 32)
	var querySQL string
	store := &Store{db: fakeDatabase{
		queryRow: func(_ context.Context, sql string, args ...any) rowScanner {
			querySQL = sql
			if len(args) != 1 || args[0] != "challenge-a" {
				t.Fatalf("consume args=%v", args)
			}
			return fakeRow(func(dest ...any) error {
				*(dest[0].(*string)) = "acct-a"
				*(dest[1].(*string)) = "dev-a"
				*(dest[2].(*string)) = "sync.push"
				*(dest[3].(*string)) = "POST"
				*(dest[4].(*string)) = "/v1/sync/push"
				*(dest[5].(*[]byte)) = append([]byte(nil), bodyDigest...)
				*(dest[6].(*time.Time)) = expiresAt
				return nil
			})
		},
	}}

	challenge, err := store.Consume(context.Background(), "challenge-a")
	if err != nil {
		t.Fatal(err)
	}
	lowerSQL := strings.ToLower(querySQL)
	for _, required := range []string{"update device_challenges", "set consumed_at", "consumed_at is null", "returning"} {
		if !strings.Contains(lowerSQL, required) {
			t.Fatalf("atomic consume query missing %q: %q", required, querySQL)
		}
	}
	if strings.Contains(lowerSQL, "select ") {
		t.Fatalf("challenge consume must not use read-then-write semantics: %q", querySQL)
	}
	if challenge.Value != "challenge-a" || challenge.Scope.AccountID != "acct-a" || challenge.Scope.DeviceID != "dev-a" || challenge.Scope.Action != "sync.push" || challenge.Scope.Method != "POST" || challenge.Scope.Path != "/v1/sync/push" || !bytes.Equal(challenge.Scope.BodySHA256, bodyDigest) || !challenge.ExpiresAt.Equal(expiresAt) || !challenge.Consumed {
		t.Fatalf("consumed challenge=%+v", challenge)
	}
}

func TestTask22ChallengeConsumeNoRowsIsReplay(t *testing.T) {
	store := &Store{db: fakeDatabase{
		queryRow: func(context.Context, string, ...any) rowScanner {
			return fakeRow(func(...any) error { return pgx.ErrNoRows })
		},
	}}
	_, err := store.Consume(context.Background(), "already-used")
	if !errors.Is(err, deviceauth.ErrChallengeReplay) {
		t.Fatalf("consume error=%v, want ErrChallengeReplay", err)
	}
}
