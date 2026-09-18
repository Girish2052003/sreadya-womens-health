-- Sreadya C2 identity scaffold. PostgreSQL target: 18.6.
-- Account identity is deliberately separate from encrypted-vault decryption.
CREATE TABLE accounts (
    account_id UUID PRIMARY KEY,
    state TEXT NOT NULL CHECK (state IN ('active', 'disabled', 'deleted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
