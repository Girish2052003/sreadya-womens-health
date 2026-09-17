package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"

	"sreva.dev/sync_service/internal/deviceauth"
)

var _ deviceauth.ChallengeStore = (*Store)(nil)

// Put persists one short-lived authorization challenge and its opaque request
// scope. The table contains no sync ciphertext or readable health payload.
func (s *Store) Put(ctx context.Context, challenge deviceauth.Challenge) error {
	db, err := s.database()
	if err != nil {
		return err
	}
	tx, err := db.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if err := tx.Exec(ctx, `
INSERT INTO device_challenges (
    challenge_value,
    account_id,
    device_id,
    action,
    method,
    path,
    body_sha256,
    expires_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
`,
		challenge.Value,
		challenge.Scope.AccountID,
		challenge.Scope.DeviceID,
		challenge.Scope.Action,
		challenge.Scope.Method,
		challenge.Scope.Path,
		challenge.Scope.BodySHA256,
		challenge.ExpiresAt,
	); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// Consume atomically marks a challenge used and returns its frozen scope. A
// second caller cannot observe the same challenge as unused, even from another
// service instance, because PostgreSQL performs the update and return as one
// statement.
func (s *Store) Consume(ctx context.Context, value string) (deviceauth.Challenge, error) {
	db, err := s.database()
	if err != nil {
		return deviceauth.Challenge{}, err
	}

	challenge := deviceauth.Challenge{Value: value, Consumed: true}
	err = db.QueryRow(ctx, `
UPDATE device_challenges
SET consumed_at = CURRENT_TIMESTAMP
WHERE challenge_value = $1
  AND consumed_at IS NULL
RETURNING account_id,
          device_id,
          action,
          method,
          path,
          body_sha256,
          expires_at
`, value).Scan(
		&challenge.Scope.AccountID,
		&challenge.Scope.DeviceID,
		&challenge.Scope.Action,
		&challenge.Scope.Method,
		&challenge.Scope.Path,
		&challenge.Scope.BodySHA256,
		&challenge.ExpiresAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return deviceauth.Challenge{}, deviceauth.ErrChallengeReplay
	}
	if err != nil {
		return deviceauth.Challenge{}, err
	}
	return challenge, nil
}
