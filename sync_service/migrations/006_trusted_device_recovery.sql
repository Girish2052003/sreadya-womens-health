-- Sreadya C2 trusted-device continuity and opaque recovery wrappers.
-- PostgreSQL target: 18.6. Recovery material remains ciphertext-only.

ALTER TABLE devices
    ADD COLUMN approved_by_device_id UUID REFERENCES devices(device_id) ON DELETE SET NULL,
    ADD COLUMN approved_at TIMESTAMPTZ,
    ADD COLUMN revoked_by_device_id UUID REFERENCES devices(device_id) ON DELETE SET NULL;

CREATE TABLE recovery_wrappers (
    account_id UUID NOT NULL,
    vault_id UUID NOT NULL,
    key_epoch BIGINT NOT NULL CHECK (key_epoch > 0),
    protocol_version INTEGER NOT NULL CHECK (protocol_version > 0),
    suite_id TEXT NOT NULL,
    kdf_salt BYTEA NOT NULL,
    nonce BYTEA NOT NULL,
    ciphertext_and_tag BYTEA NOT NULL,
    envelope_digest BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, vault_id),
    FOREIGN KEY (account_id, vault_id)
        REFERENCES vaults(account_id, vault_id)
        ON DELETE CASCADE
);

CREATE INDEX recovery_wrappers_vault_idx ON recovery_wrappers(vault_id);
