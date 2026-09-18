// Package postgres provides the PostgreSQL implementation boundary.
package postgres

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/binary"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"sreadya.dev/sync_service/internal/devices"
	"sreadya.dev/sync_service/internal/store"
	sreadyasync "sreadya.dev/sync_service/internal/sync"
)

// TargetVersion is the reviewed PostgreSQL compatibility target.
const TargetVersion = "18.6"

const cursorPrefix = "v1."

type rowScanner interface {
	Scan(...any) error
}

type rowsScanner interface {
	Next() bool
	Scan(...any) error
	Err() error
	Close()
}

type transaction interface {
	QueryRow(context.Context, string, ...any) rowScanner
	Exec(context.Context, string, ...any) error
	Commit(context.Context) error
	Rollback(context.Context) error
}

type database interface {
	QueryRow(context.Context, string, ...any) rowScanner
	Query(context.Context, string, ...any) (rowsScanner, error)
	Begin(context.Context) (transaction, error)
}

type poolDatabase struct {
	pool *pgxpool.Pool
}

func (d poolDatabase) QueryRow(ctx context.Context, sql string, args ...any) rowScanner {
	return d.pool.QueryRow(ctx, sql, args...)
}

func (d poolDatabase) Query(ctx context.Context, sql string, args ...any) (rowsScanner, error) {
	rows, err := d.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	return rows, nil
}

func (d poolDatabase) Begin(ctx context.Context) (transaction, error) {
	tx, err := d.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	return pgxTransaction{tx: tx}, nil
}

type pgxTransaction struct {
	tx pgx.Tx
}

func (t pgxTransaction) QueryRow(ctx context.Context, sql string, args ...any) rowScanner {
	return t.tx.QueryRow(ctx, sql, args...)
}

func (t pgxTransaction) Exec(ctx context.Context, sql string, args ...any) error {
	_, err := t.tx.Exec(ctx, sql, args...)
	return err
}

func (t pgxTransaction) Commit(ctx context.Context) error {
	return t.tx.Commit(ctx)
}

func (t pgxTransaction) Rollback(ctx context.Context) error {
	return t.tx.Rollback(ctx)
}

// Store adapts pgxpool to the provider-independent persistence lifecycle.
type Store struct {
	pool *pgxpool.Pool
	db   database
}

var (
	_ store.Store                = (*Store)(nil)
	_ devices.Lookup             = (*Store)(nil)
	_ sreadyasync.Repository       = (*Store)(nil)
	_ sreadyasync.AtomicRepository = (*Store)(nil)
	_ sreadyasync.PullRepository   = (*Store)(nil)
)

// Open creates a PostgreSQL-backed store without assuming any cloud provider.
func Open(ctx context.Context, databaseURL string) (*Store, error) {
	if strings.TrimSpace(databaseURL) == "" {
		return nil, errors.New("database URL is required")
	}

	pool, err := pgxpool.New(ctx, strings.TrimSpace(databaseURL))
	if err != nil {
		return nil, err
	}
	return &Store{pool: pool, db: poolDatabase{pool: pool}}, nil
}

func (s *Store) database() (database, error) {
	if s == nil || s.db == nil {
		return nil, errors.New("postgres store is not open")
	}
	return s.db, nil
}

// Ping reports whether PostgreSQL is reachable.
func (s *Store) Ping(ctx context.Context) error {
	if s == nil || s.pool == nil {
		return errors.New("postgres store is not open")
	}
	return s.pool.Ping(ctx)
}

// Close releases database resources. It is safe to call on an unopened store.
func (s *Store) Close() error {
	if s == nil || s.pool == nil {
		return nil
	}
	s.pool.Close()
	return nil
}

// Device returns the opaque authorization state and public signing identity
// required by the sync authorization layer. Private signing material is never
// stored by the service.
func (s *Store) Device(ctx context.Context, deviceID string) (devices.Record, error) {
	db, err := s.database()
	if err != nil {
		return devices.Record{}, err
	}
	var accountID, state, signatureSuite string
	var publicSigningKey []byte
	err = db.QueryRow(ctx, `
SELECT account_id,
       state,
       public_signing_key,
       signature_suite
FROM devices
WHERE device_id = $1
`, deviceID).Scan(&accountID, &state, &publicSigningKey, &signatureSuite)
	if errors.Is(err, pgx.ErrNoRows) {
		return devices.Record{}, devices.ErrDeviceNotFound
	}
	if err != nil {
		return devices.Record{}, err
	}
	if len(publicSigningKey) != 0 && len(publicSigningKey) != len(devices.Record{}.PublicSigningKey) {
		return devices.Record{}, errors.New("stored device signing key has invalid length")
	}
	var key [32]byte
	copy(key[:], publicSigningKey)
	return devices.Record{
		DeviceID:         deviceID,
		AccountID:        accountID,
		State:            devices.State(state),
		PublicSigningKey: key,
		SignatureSuite:   signatureSuite,
	}, nil
}

// VaultAccount returns the account owner of an opaque vault identifier.
func (s *Store) VaultAccount(ctx context.Context, vaultID string) (string, error) {
	db, err := s.database()
	if err != nil {
		return "", err
	}
	var accountID string
	if err := db.QueryRow(ctx, `
SELECT account_id
FROM vaults
WHERE vault_id = $1
`, vaultID).Scan(&accountID); err != nil {
		return "", err
	}
	return accountID, nil
}

// ExistingEvent looks up only idempotency metadata for an event ID.
func (s *Store) ExistingEvent(ctx context.Context, eventID string) ([]byte, sreadyasync.Ack, bool, error) {
	db, err := s.database()
	if err != nil {
		return nil, sreadyasync.Ack{}, false, err
	}
	var digest []byte
	var committedRevision int64
	var conflict bool
	err = db.QueryRow(ctx, `
SELECT envelope_digest,
       committed_revision,
       (base_revision <> committed_revision - 1) AS conflict
FROM sync_events
WHERE event_id = $1
`, eventID).Scan(&digest, &committedRevision, &conflict)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, sreadyasync.Ack{}, false, nil
	}
	if err != nil {
		return nil, sreadyasync.Ack{}, false, err
	}
	return digest, sreadyasync.Ack{
		EventID:           eventID,
		CommittedRevision: committedRevision,
		Conflict:          conflict,
	}, true, nil
}

// CurrentRevision returns the highest committed revision for one opaque object.
func (s *Store) CurrentRevision(ctx context.Context, vaultID, objectID string) (int64, error) {
	db, err := s.database()
	if err != nil {
		return 0, err
	}
	var revision int64
	if err := db.QueryRow(ctx, `
SELECT COALESCE(MAX(committed_revision), 0)
FROM sync_events
WHERE vault_id = $1 AND object_id = $2
`, vaultID, objectID).Scan(&revision); err != nil {
		return 0, err
	}
	return revision, nil
}

// Commit satisfies the basic repository boundary for non-atomic callers. The
// production sync service uses CommitEnvelope instead.
func (s *Store) Commit(ctx context.Context, envelope sreadyasync.Envelope, ack sreadyasync.Ack) error {
	db, err := s.database()
	if err != nil {
		return err
	}
	tx, err := db.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if err := insertEvent(ctx, tx, envelope, ack); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// CommitEnvelope performs idempotency, object-revision allocation and insert in
// one PostgreSQL transaction. Locking the vault row serializes commits to that
// vault across service instances without interpreting health data.
func (s *Store) CommitEnvelope(ctx context.Context, envelope sreadyasync.Envelope) (sreadyasync.Ack, error) {
	db, err := s.database()
	if err != nil {
		return sreadyasync.Ack{}, err
	}
	tx, err := db.Begin(ctx)
	if err != nil {
		return sreadyasync.Ack{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var accountID string
	if err := tx.QueryRow(ctx, `
SELECT account_id
FROM vaults
WHERE vault_id = $1
FOR UPDATE
`, envelope.VaultID).Scan(&accountID); err != nil {
		return sreadyasync.Ack{}, err
	}
	if envelope.AccountID != "" && accountID != envelope.AccountID {
		return sreadyasync.Ack{}, sreadyasync.ErrCrossAccount
	}

	var existingDigest []byte
	var existingRevision int64
	var existingConflict bool
	err = tx.QueryRow(ctx, `
SELECT envelope_digest,
       committed_revision,
       (base_revision <> committed_revision - 1) AS conflict
FROM sync_events
WHERE event_id = $1
`, envelope.EventID).Scan(&existingDigest, &existingRevision, &existingConflict)
	if err == nil {
		if !bytes.Equal(existingDigest, envelope.EnvelopeDigest) {
			return sreadyasync.Ack{}, sreadyasync.ErrEventIDReuse
		}
		return sreadyasync.Ack{
			EventID:           envelope.EventID,
			CommittedRevision: existingRevision,
			Conflict:          existingConflict,
			Existing:          true,
		}, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return sreadyasync.Ack{}, err
	}

	var currentRevision int64
	if err := tx.QueryRow(ctx, `
SELECT COALESCE(MAX(committed_revision), 0)
FROM sync_events
WHERE vault_id = $1 AND object_id = $2
`, envelope.VaultID, envelope.ObjectID).Scan(&currentRevision); err != nil {
		return sreadyasync.Ack{}, err
	}
	ack := sreadyasync.Ack{
		EventID:           envelope.EventID,
		CommittedRevision: currentRevision + 1,
		Conflict:          envelope.BaseRevision != currentRevision,
	}
	if err := insertEvent(ctx, tx, envelope, ack); err != nil {
		return sreadyasync.Ack{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return sreadyasync.Ack{}, err
	}
	return ack, nil
}

func insertEvent(ctx context.Context, tx transaction, envelope sreadyasync.Envelope, ack sreadyasync.Ack) error {
	return tx.Exec(ctx, `
INSERT INTO sync_events (
    event_id,
    vault_id,
    source_device_id,
    object_id,
    key_epoch,
    protocol_version,
    suite_id,
    schema_id,
    base_revision,
    committed_revision,
    operation,
    kdf_salt,
    nonce,
    ciphertext_and_tag,
    envelope_digest,
    created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8,
    $9, $10, $11, $12, $13, $14, $15, $16
)
`,
		envelope.EventID,
		envelope.VaultID,
		envelope.SourceDeviceID,
		envelope.ObjectID,
		envelope.KeyEpoch,
		envelope.ProtocolVersion,
		envelope.SuiteID,
		envelope.SchemaID,
		envelope.BaseRevision,
		ack.CommittedRevision,
		envelope.Operation,
		envelope.KDFSalt,
		envelope.Nonce,
		envelope.CiphertextAndTag,
		envelope.EnvelopeDigest,
		envelope.CreatedAt,
	)
}

// EventsAfter returns a vault page in server-sequence order. The cursor is
// versioned and opaque to clients; object revisions remain independent.
func (s *Store) EventsAfter(ctx context.Context, vaultID, cursor string, limit int) (sreadyasync.PullPage, error) {
	db, err := s.database()
	if err != nil {
		return sreadyasync.PullPage{}, err
	}
	sequence, err := decodeCursor(cursor)
	if err != nil {
		return sreadyasync.PullPage{}, err
	}
	rows, err := db.Query(ctx, `
SELECT
    v.account_id,
    e.vault_id,
    e.event_id,
    e.object_id,
    e.source_device_id,
    e.key_epoch,
    e.protocol_version,
    e.suite_id,
    e.schema_id,
    e.base_revision,
    e.operation,
    e.kdf_salt,
    e.nonce,
    e.ciphertext_and_tag,
    e.envelope_digest,
    e.created_at,
    e.committed_revision,
    (e.base_revision <> e.committed_revision - 1) AS conflict,
    e.server_sequence
FROM sync_events e
JOIN vaults v ON v.vault_id = e.vault_id
WHERE e.vault_id = $1 AND e.server_sequence > $2
ORDER BY e.server_sequence ASC
LIMIT $3
`, vaultID, sequence, limit)
	if err != nil {
		return sreadyasync.PullPage{}, err
	}
	defer rows.Close()

	page := sreadyasync.PullPage{NextCursor: cursor}
	var lastSequence int64
	for rows.Next() {
		var event sreadyasync.StoredEvent
		if err := rows.Scan(
			&event.Envelope.AccountID,
			&event.Envelope.VaultID,
			&event.Envelope.EventID,
			&event.Envelope.ObjectID,
			&event.Envelope.SourceDeviceID,
			&event.Envelope.KeyEpoch,
			&event.Envelope.ProtocolVersion,
			&event.Envelope.SuiteID,
			&event.Envelope.SchemaID,
			&event.Envelope.BaseRevision,
			&event.Envelope.Operation,
			&event.Envelope.KDFSalt,
			&event.Envelope.Nonce,
			&event.Envelope.CiphertextAndTag,
			&event.Envelope.EnvelopeDigest,
			&event.Envelope.CreatedAt,
			&event.CommittedRevision,
			&event.Conflict,
			&lastSequence,
		); err != nil {
			return sreadyasync.PullPage{}, err
		}
		page.Events = append(page.Events, event)
	}
	if err := rows.Err(); err != nil {
		return sreadyasync.PullPage{}, err
	}
	if len(page.Events) > 0 {
		page.NextCursor = encodeCursor(lastSequence)
	}
	return page, nil
}

func encodeCursor(sequence int64) string {
	var raw [8]byte
	binary.BigEndian.PutUint64(raw[:], uint64(sequence))
	return cursorPrefix + base64.RawURLEncoding.EncodeToString(raw[:])
}

func decodeCursor(cursor string) (int64, error) {
	if cursor == "" {
		return 0, nil
	}
	if !strings.HasPrefix(cursor, cursorPrefix) {
		return 0, sreadyasync.ErrInvalidCursor
	}
	raw, err := base64.RawURLEncoding.DecodeString(strings.TrimPrefix(cursor, cursorPrefix))
	if err != nil || len(raw) != 8 || raw[0]&0x80 != 0 {
		return 0, sreadyasync.ErrInvalidCursor
	}
	return int64(binary.BigEndian.Uint64(raw)), nil
}
