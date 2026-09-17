-- Sreva C2 ciphertext-only continuity scaffold. PostgreSQL target: 18.6.
-- No readable domain payload is stored by these tables.
CREATE TABLE vaults (
    vault_id UUID PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    key_epoch BIGINT NOT NULL CHECK (key_epoch > 0),
    suite_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (account_id, vault_id)
);

CREATE TABLE sync_events (
    event_id UUID PRIMARY KEY,
    vault_id UUID NOT NULL REFERENCES vaults(vault_id) ON DELETE CASCADE,
    source_device_id UUID NOT NULL REFERENCES devices(device_id),
    object_id UUID NOT NULL,
    key_epoch BIGINT NOT NULL CHECK (key_epoch > 0),
    protocol_version INTEGER NOT NULL,
    suite_id TEXT NOT NULL,
    schema_id TEXT NOT NULL,
    base_revision BIGINT NOT NULL CHECK (base_revision >= 0),
    committed_revision BIGINT NOT NULL CHECK (committed_revision > 0),
    operation TEXT NOT NULL CHECK (operation IN ('upsert', 'tombstone')),
    kdf_salt BYTEA NOT NULL,
    nonce BYTEA NOT NULL,
    ciphertext_and_tag BYTEA NOT NULL,
    envelope_digest BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (vault_id, object_id, committed_revision)
);

CREATE INDEX sync_events_vault_revision_idx ON sync_events(vault_id, committed_revision);
CREATE INDEX sync_events_object_revision_idx ON sync_events(vault_id, object_id, committed_revision);
