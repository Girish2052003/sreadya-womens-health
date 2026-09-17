package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"

	"sreva.dev/sync_service/internal/continuity"
	"sreva.dev/sync_service/internal/devices"
)

var _ continuity.Store = (*Store)(nil)

// ActivateDevice transitions one pending device to active while recording the
// already-active same-account device that approved it.
func (s *Store) ActivateDevice(ctx context.Context, accountID, targetDeviceID, approvingDeviceID string) error {
	db, err := s.database()
	if err != nil {
		return err
	}
	tx, err := db.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var marker int
	if err := tx.QueryRow(ctx, `
SELECT 1
FROM devices
WHERE device_id = $1
  AND account_id = $2
  AND state = 'active'
FOR UPDATE
`, approvingDeviceID, accountID).Scan(&marker); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return devices.ErrDeviceRevoked
		}
		return err
	}
	if err := tx.QueryRow(ctx, `
SELECT 1
FROM devices
WHERE device_id = $1
  AND account_id = $2
  AND state = 'pending'
FOR UPDATE
`, targetDeviceID, accountID).Scan(&marker); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return continuity.ErrTargetNotPending
		}
		return err
	}

	if err := tx.Exec(ctx, `
UPDATE devices
SET state = 'active',
    approved_by_device_id = $3,
    approved_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE device_id = $1
  AND account_id = $2
  AND state = 'pending'
`, targetDeviceID, accountID, approvingDeviceID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// RevokeDevice records a revocation at the account boundary. A revoked device
// immediately fails the shared devices.Service authorization path used by sync.
func (s *Store) RevokeDevice(ctx context.Context, accountID, targetDeviceID, approvingDeviceID string) error {
	db, err := s.database()
	if err != nil {
		return err
	}
	tx, err := db.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var marker int
	if err := tx.QueryRow(ctx, `
SELECT 1
FROM devices
WHERE device_id = $1
  AND account_id = $2
  AND state = 'active'
FOR UPDATE
`, approvingDeviceID, accountID).Scan(&marker); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return devices.ErrDeviceRevoked
		}
		return err
	}
	if err := tx.QueryRow(ctx, `
SELECT 1
FROM devices
WHERE device_id = $1
  AND account_id = $2
  AND state <> 'revoked'
FOR UPDATE
`, targetDeviceID, accountID).Scan(&marker); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return devices.ErrDeviceRevoked
		}
		return err
	}

	if err := tx.Exec(ctx, `
UPDATE devices
SET state = 'revoked',
    revoked_at = CURRENT_TIMESTAMP,
    revoked_by_device_id = $3,
    updated_at = CURRENT_TIMESTAMP
WHERE device_id = $1
  AND account_id = $2
  AND state <> 'revoked'
`, targetDeviceID, accountID, approvingDeviceID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// PutRecoveryWrapper stores only the opaque client-produced wrapper. The
// composite foreign key in migration 006 binds account ownership to the vault.
func (s *Store) PutRecoveryWrapper(ctx context.Context, wrapper continuity.RecoveryWrapper) error {
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
INSERT INTO recovery_wrappers (
    account_id,
    vault_id,
    key_epoch,
    protocol_version,
    suite_id,
    kdf_salt,
    nonce,
    ciphertext_and_tag,
    envelope_digest
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
ON CONFLICT (account_id, vault_id) DO UPDATE SET
    key_epoch = EXCLUDED.key_epoch,
    protocol_version = EXCLUDED.protocol_version,
    suite_id = EXCLUDED.suite_id,
    kdf_salt = EXCLUDED.kdf_salt,
    nonce = EXCLUDED.nonce,
    ciphertext_and_tag = EXCLUDED.ciphertext_and_tag,
    envelope_digest = EXCLUDED.envelope_digest,
    updated_at = CURRENT_TIMESTAMP
`,
		wrapper.AccountID,
		wrapper.VaultID,
		wrapper.KeyEpoch,
		wrapper.ProtocolVersion,
		wrapper.SuiteID,
		wrapper.KDFSalt,
		wrapper.Nonce,
		wrapper.CiphertextAndTag,
		wrapper.EnvelopeDigest,
	); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// RecoveryWrapper returns opaque wrapper bytes unchanged.
func (s *Store) RecoveryWrapper(ctx context.Context, accountID, vaultID string) (continuity.RecoveryWrapper, error) {
	db, err := s.database()
	if err != nil {
		return continuity.RecoveryWrapper{}, err
	}
	wrapper := continuity.RecoveryWrapper{AccountID: accountID, VaultID: vaultID}
	if err := db.QueryRow(ctx, `
SELECT key_epoch,
       protocol_version,
       suite_id,
       kdf_salt,
       nonce,
       ciphertext_and_tag,
       envelope_digest
FROM recovery_wrappers
WHERE account_id = $1 AND vault_id = $2
`, accountID, vaultID).Scan(
		&wrapper.KeyEpoch,
		&wrapper.ProtocolVersion,
		&wrapper.SuiteID,
		&wrapper.KDFSalt,
		&wrapper.Nonce,
		&wrapper.CiphertextAndTag,
		&wrapper.EnvelopeDigest,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return continuity.RecoveryWrapper{}, continuity.ErrRecoveryWrapperNotFound
		}
		return continuity.RecoveryWrapper{}, err
	}
	wrapper.KDFSalt = append([]byte(nil), wrapper.KDFSalt...)
	wrapper.Nonce = append([]byte(nil), wrapper.Nonce...)
	wrapper.CiphertextAndTag = append([]byte(nil), wrapper.CiphertextAndTag...)
	wrapper.EnvelopeDigest = append([]byte(nil), wrapper.EnvelopeDigest...)
	return wrapper, nil
}

// DeleteAccount deletes the server-owned cascade root only. It does not and
// cannot assert deletion of copies that have already left the service.
func (s *Store) DeleteAccount(ctx context.Context, accountID string) error {
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
DELETE FROM accounts
WHERE account_id = $1
`, accountID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
