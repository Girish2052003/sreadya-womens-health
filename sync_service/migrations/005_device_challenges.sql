-- Sreadya C2 one-use device authorization challenges. PostgreSQL target: 18.6.
-- This table stores only operational authorization scope. It never stores health plaintext or sync ciphertext.
CREATE TABLE device_challenges (
    challenge_value TEXT PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    body_sha256 BYTEA NOT NULL CHECK (octet_length(body_sha256) = 32),
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX device_challenges_device_expiry_idx
    ON device_challenges (device_id, expires_at);

CREATE INDEX device_challenges_unconsumed_expiry_idx
    ON device_challenges (expires_at)
    WHERE consumed_at IS NULL;
