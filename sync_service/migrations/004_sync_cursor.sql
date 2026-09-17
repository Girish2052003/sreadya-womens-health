-- Task 22: server-only monotonic ordering for opaque vault pull cursors.
-- This value is operational metadata only. It carries no health semantics and
-- is independent of each object's committed_revision conflict/version graph.
ALTER TABLE sync_events
    ADD COLUMN server_sequence BIGINT GENERATED ALWAYS AS IDENTITY;

CREATE UNIQUE INDEX sync_events_server_sequence_uq
    ON sync_events (server_sequence);

CREATE INDEX sync_events_vault_server_sequence_idx
    ON sync_events (vault_id, server_sequence);
