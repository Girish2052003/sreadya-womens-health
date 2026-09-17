# C2 Task 22 — Ciphertext Sync API Closure

Status: **FORMALLY CLOSED / GREEN**

## Authoritative tested baseline

- Branch: `feat/task22-ciphertext-sync-api`
- Tested code SHA: `ab4fc34090eb6450a5cfb856e3e6745a55a4b55f`
- Dedicated workflow: `C2 Task 22 Ciphertext Sync API`
- Exact-head run: `35178283892`
- Result: `SUCCESS`

The closure-note commit is documentation only. The tested code SHA above remains the authoritative Task-22 implementation baseline.

## Frozen-plan coverage

Task 22 from `docs/superpowers/plans/2026-09-16-sreva-c2-cross-platform-implementation.md` requires:

- provider-independent opaque ciphertext sync service and handlers;
- device authorization;
- server-side operation on opaque IDs, versions, ciphertext/envelopes and minimal operational timestamps only;
- cross-account, stale/replay, revoked-device, oversized-payload and concurrent-update tests;
- Web offline encrypted queue;
- idempotent upload;
- pull/apply only after local decrypt and validation;
- conflict behavior aligned with the shared protocol vectors;
- pause/disable sync behavior.

All of those requirements are represented by implementation and executable tests on the tested baseline.

## Server evidence

The Go service and HTTP boundary provide:

- account/vault/device authorization before commit or pull;
- durable PostgreSQL ciphertext persistence;
- event-ID idempotency anchored to SHA-256 of the exact signed HTTP body, not a client-supplied digest;
- atomic PostgreSQL revision allocation for production persistence;
- per-object committed revisions kept separate from the opaque vault pull cursor;
- server-only monotonic pull ordering through `server_sequence`;
- stale/concurrent branches preserved instead of silently overwriting;
- explicit ciphertext size limits;
- cross-account and revoked-device rejection;
- one-use durable signed-device challenges;
- exact Task-19 `sreva-device-auth-v1` LP16 Ed25519 verification;
- exact request-body binding for push and canonical request-target binding for pull;
- safe `Cache-Control: no-store` HTTP behavior;
- no parsing of decrypted health payloads on the server.

## Web evidence

The Web sync layer provides:

- separate durable Dexie sync outbox state, downstream of the local health-vault commit;
- immutable queued request bytes and stable event-ID retry semantics;
- Task-19 HKDF-SHA-256 + AES-256-GCM event encryption/decryption using the shared LP16 framing;
- golden interoperability-vector coverage and ciphertext/AAD tamper rejection;
- signed challenge/push/pull client requests;
- exact Go-compatible pull-target encoding;
- cursor advancement only after all pulled events are safely applied or conflict-preserved;
- authenticated decrypt -> schema/domain validation -> revision decision -> apply/preserve ordering;
- ciphertext-only conflict persistence for stale, concurrent and missing-predecessor branches;
- production encrypted outgoing-event generation from an already-committed local change;
- reconnect orchestration that drains pending uploads before pull/apply;
- pause with zero network activity;
- disable clearing sync outbox/cursor/pause state and preserved sync conflicts without deleting the local health vault.

## Verification gate

Exact-head run `35178283892` passed:

- pinned Go module-lock reproducibility;
- `go test ./...`;
- `go vet ./...`;
- Web TypeScript typecheck;
- complete Web unit/integration test suite used by the Task-22 gate.

## Boundary to Task 23

Task 22 does not claim trusted-device enrollment, recovery-key continuity, account-recovery UX, or account/device management pages. Those are Task 23 responsibilities. Task 22 exposes and verifies the ciphertext-sync/device-authorization boundary that Task 23 can consume.

The service executable/deployment composition is intentionally not used as a Task-22 acceptance criterion because the frozen Task-22 plan scopes this task to the sync service/handlers/device authorization and Web sync client/queue behavior. Production account/session continuity and trusted-device flows are completed in Task 23 before release hardening.
