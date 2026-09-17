# Sreva Task 22 Web Sync Client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Task-22 browser ciphertext sync outbox/client without weakening local-first behavior or the frozen Task-19 cryptographic protocol.

**Architecture:** Keep sync downstream of local health persistence. A Dexie-backed encrypted/opaque outbox stores immutable request bytes and cursor state; a signed HTTP client retries those exact bytes idempotently and only advances the pull cursor after an injected local decrypt/validate/apply boundary reports safe completion or conflict preservation.

**Tech Stack:** TypeScript 6.0.3, Dexie 4.4.6, WebCrypto, Vitest 5.0.0, Node 24.21.0.

**Spec:** `docs/superpowers/specs/2026-09-17-sreva-task22-web-sync-client-design.md`

## Global Constraints

- Preserve `shared/crypto/e2ee-key-hierarchy-v1.md` and `shared/sync/protocol-v1.md` byte semantics.
- Never persist health plaintext, VRS, Recovery Secret, private signing keys, OTPs, or decrypted remote records in the sync queue.
- Local health writes must never depend on network availability.
- Event request bytes are immutable after enqueue; `event_id` is the idempotency key.
- Pull cursor advances only after safe local application or explicit conflict preservation.
- `pause` stops networking but retains queue and local vault state.
- No new runtime dependency is required; use the already-pinned Dexie/WebCrypto stack.

---

### Task 1: Durable opaque outbox and cursor state

**Files:**
- Create: `web/src/sync/queue.ts`
- Create: `web/src/sync/queue.test.ts`

**Interfaces:**
- Produces: `SyncQueue`, `SyncQueuePersistence`, `DexieSyncQueuePersistence`, `QueuedSyncEvent`, `SyncQueueState`.

- [ ] **Step 1: Write RED tests** for immutable enqueue, duplicate event-ID rejection when bytes differ, idempotent duplicate enqueue when bytes match, FIFO pending order, acknowledgement removal, pause retention, cursor persistence, and explicit sync-state clearing without touching the health vault.
- [ ] **Step 2: Run** `cd web && npm test -- --run src/sync/queue.test.ts`; expect missing-module/symbol RED.
- [ ] **Step 3: Implement minimal queue** with a pure persistence interface plus separate Dexie `sreva-sync-v1` stores for outbox and state. Copy byte arrays on ingress/egress so callers cannot mutate queued request bytes.
- [ ] **Step 4: Run** `npm test -- --run src/sync/queue.test.ts && npm run typecheck`; expect GREEN.
- [ ] **Step 5: Commit** `web(task22): add durable opaque sync outbox`.

### Task 2: Frozen Task-19 signed HTTP client

**Files:**
- Create: `web/src/sync/client.ts`
- Create: `web/src/sync/client.test.ts`

**Interfaces:**
- Consumes: `SyncQueue` from Task 1.
- Produces: `DeviceSigner`, `RemoteEventApplier`, `SignedSyncClient`.

- [ ] **Step 1: Write RED tests** for exact queued-byte SHA-256, canonical LP16 transcript bytes, challenge-before-push, raw 64-byte signature base64 header, immutable body upload, acknowledgement removal, retry retention, canonical opaque pull target, and no cursor advancement on failed application.
- [ ] **Step 2: Run** `npm test -- --run src/sync/client.test.ts`; expect missing client symbols.
- [ ] **Step 3: Implement minimal signed transport** using native WebCrypto SHA-256, deterministic LP16 framing, injected `DeviceSigner`, injected `fetch`, and static/generic error objects that never durably store server bodies.
- [ ] **Step 4: Run** client tests + Task-19 WebCrypto conformance + typecheck.
- [ ] **Step 5: Commit** `web(task22): add signed ciphertext sync client`.

### Task 3: Reconnect, conflict preservation, pause/disable

**Files:**
- Modify: `web/src/sync/client.ts`
- Modify: `web/src/sync/client.test.ts`
- Modify: `web/src/sync/queue.ts`
- Modify: `web/src/sync/queue.test.ts`

**Interfaces:**
- `RemoteEventApplier.apply(event)` returns `applied | conflict-preserved`; any throw/failure retains the previous cursor.

- [ ] **Step 1: RED tests** prove reconnect uploads all pending immutable events in FIFO order, pulls afterward, cursor advances only after the entire page is safe, conflict-preserved is allowed, failed decrypt/schema/apply retains cursor, pause performs zero network calls, and disable clears only sync queue/cursor state.
- [ ] **Step 2: Implement smallest orchestration** `syncOnce()` and explicit `pause/resume/disable` queue state transitions.
- [ ] **Step 3: Run full Web unit suite/typecheck and commit** `web(task22): enforce local-first reconnect and conflict safety`.

### Task 4: Reachable Go runtime assembly

**Files:**
- Modify: `sync_service/internal/httpapi/router.go`
- Add/modify router tests.
- Modify: `sync_service/cmd/sreva-sync/main.go` only to the extent required for a fail-closed runnable composition boundary.

**Interfaces:**
- Register the already-tested Task-22 sync handler through an explicit router option. Production assembly must refuse to expose sync endpoints without session resolution, signed-device authorization, and storage dependencies.

- [ ] **Step 1: RED tests** prove the router exposes sync routes only when all required dependencies are supplied and otherwise has no unsigned sync endpoint.
- [ ] **Step 2: Implement additive router wiring** without changing Task-20 health/readiness or Task-21 identity semantics.
- [ ] **Step 3: Run full Go lock/tests/vet and commit** `sync(task22): wire authorized ciphertext sync runtime`.

### Task 5: Task-22 closure gate

**Files:**
- Create: `docs/verification/C2_TASK22_CIPHERTEXT_SYNC_CLOSURE.md`

- [ ] **Step 1: Audit frozen Task-22 requirements**: cross-account, revoked device, oversized payload, stale/concurrent updates, one-time signed authorization, durable server persistence, opaque cursor, Web durable encrypted/opaque queue, idempotent upload, safe pull/apply, conflict preservation, pause/disable.
- [ ] **Step 2: Run exact-head Task-22 CI** and require module-lock, all Go tests, vet, Web typecheck, and Web tests green on one SHA.
- [ ] **Step 3: Record exact closure SHA/run and commit** `sync: add authorized opaque ciphertext synchronization`.
