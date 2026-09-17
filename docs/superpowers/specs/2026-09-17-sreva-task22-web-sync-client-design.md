# Sreva Task 22 Web Sync Client Design

**Status:** Approved Task-22 Web slice. This document is subordinate to `docs/superpowers/plans/2026-09-16-sreva-c2-cross-platform-implementation.md` and must not weaken the frozen Task-19 protocol.

## Goal

Add a browser sync boundary that keeps local health capture authoritative and available offline, persists only encrypted/opaque outbound sync records, performs the frozen one-time Ed25519 request authorization flow, retries immutable events idempotently, pulls ciphertext by opaque cursor, and advances the cursor only after safe local application or explicit conflict preservation.

## Architecture

1. `web/src/sync/queue.ts` owns an isolated durable outbox and sync cursor state. Production persistence uses a separate Dexie database named `sreva-sync-v1`. The queue stores immutable exact UTF-8 request bodies containing encrypted envelopes plus opaque operational metadata only. It never stores health plaintext, VRS, Recovery Secret, private signing keys, OTPs, account passwords, or decrypted remote records.
2. `web/src/sync/client.ts` owns HTTP transport and Task-19 signed authorization. A device signer is injected; Task 22 does not decide how the private Ed25519 key is provisioned or protected. Push hashes the exact queued bytes, obtains a `sync.push` challenge, signs the frozen `sreva-device-auth-v1` LP16 transcript, and sends the same immutable bytes. Pull obtains a challenge for a canonical opaque target and signs the same frozen transcript construction.
3. Reconnect orchestration is local-first: local health writes complete before sync work. Upload failure leaves the immutable event queued. Pull events are delivered to an injected safe-application boundary that decrypts/authenticates/validates locally. The client advances the cursor only after every returned event is reported as safely applied or explicitly preserved as a conflict.
4. Pause disables network processing without deleting queued ciphertext or changing local health behavior. Disable clears account-sync state only when explicitly requested by the caller; it does not delete the local health vault.

## Security invariants

- Exact push bytes are stable from queue insertion through request hashing and upload.
- Stable `event_id` is the idempotency key; acknowledged events are removed only after a successful matching acknowledgement.
- No health values appear in sync URLs. Pull URLs contain opaque `vault_id`, opaque cursor, and numeric limit only.
- Task-19 LP16 framing and SHA-256 request-body digest are reproduced exactly; no JSON transcript replaces them.
- Device private keys are injected through a signer interface and are never persisted by the queue.
- Server error text, challenge values, signatures, ciphertext, or decrypted data are never copied into durable queue diagnostics.
- Cursor advancement is transactional at the queue-state boundary and happens only after safe application/preservation of the page.
- Account-free/local-only behavior remains complete when sync is paused, disabled, offline, or failing.

## Interfaces

`SyncQueue` exposes enqueue/peek/remove/cursor/pause operations over an injected `SyncQueuePersistence`. `DexieSyncQueuePersistence` is the production implementation.

`SignedSyncClient` receives an API base URL, account/device identity, signer, queue, fetch implementation, and an injected remote-event applier. It never owns cycle-domain semantics.

## Verification

Vitest RED/GREEN tests cover immutable enqueue and duplicate-event protection, pause behavior, idempotent upload, exact body hashing, LP16 signing, safe pull/cursor advancement, failed-apply cursor retention, conflict preservation, and retry retention. Existing Task-19 WebCrypto conformance continues to verify the canonical Ed25519 vector. The Task-22 CI gate must finish with Web typecheck/tests and full Go lock/tests/vet green on the same closure SHA.
