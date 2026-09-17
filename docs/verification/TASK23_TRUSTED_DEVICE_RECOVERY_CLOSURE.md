# Task 23 — Trusted-Device Approval and Recovery-Key Formal Closure

Status: **FORMALLY CLOSED**

## Tested closure baseline

- Branch: `feat/task23-trusted-device-recovery`
- Tested code SHA: `325c3775578fb860853b0be23ea728190ba05243`
- Dedicated workflow: `C2 Task 23 Trusted Device Recovery`
- Successful exact-head run: `35182542037`
- Inherited protocol workflow: `C2 Task 19 E2EE Protocol Interoperability`
- Successful same-SHA run: `35182542212`
- Required Task-23 checks on the same SHA:
  - pinned Go module lock reproducibility: PASS
  - `go test ./...`: PASS
  - `go vet ./...`: PASS
  - Web TypeScript typecheck: PASS
  - Web Vitest suite: PASS
- Required inherited Task-19 checks on the same SHA:
  - Dart E2EE v1 golden-vector interoperability: PASS
  - Go standard-library E2EE v1 interoperability: PASS
  - Task-23 Go service-package verification and vet: PASS
  - WebCrypto E2EE v1 and Task-23 continuity crypto flows: PASS

The documentation commit containing this note is not a replacement verification baseline. Any later task must inherit the tested code SHA above, or a descendant that is independently reverified.

## Frozen Task-23 requirement coverage

Task 23 is the trusted-device approval and recovery-key continuity boundary defined in `docs/superpowers/plans/2026-09-16-sreva-c2-cross-platform-implementation.md`.

Implemented and verified production surfaces include:

- `web/src/account/passkeys.ts` — browser WebAuthn registration/login adapter with required-field validation, binary option decoding, and opaque ceremony-session header transport.
- `web/src/account/trusted-devices.ts` — frozen Task-19 trusted-device direct-transfer parsing, key derivation, authenticated unwrap, and identity-bound metadata.
- `web/src/account/recovery.ts` — independent recovery-key derivation and authenticated recovery-envelope unwrap.
- Private Web pages `/app/account`, `/app/devices`, `/app/recovery`, and `/app/sync`.
- Go trusted-device/recovery continuity service and signed HTTP mutation routes.
- PostgreSQL migration `006` and durable continuity persistence for device approval provenance and ciphertext-only recovery wrappers.
- Existing Task-22 encrypted synchronization authorization remains the sync enforcement boundary for active/revoked devices.

Sensitive continuity mutations reuse the Task-19 device-auth model: account/device/action scope, server-issued challenge, exact request-body SHA-256 binding, canonical request transcript, and device signature verification. Recovery-envelope reads remain account-session accessible so possession of the independent user-held recovery key can restore continuity after trusted devices are lost; account authentication alone does not unwrap the old vault.

## Frozen six-scenario acceptance matrix

1. **Existing device approves new Web device — PASS.**
   - `sync_service/internal/continuity/service_test.go::TestExistingTrustedDeviceApprovesPendingDevice`
   - `sync_service/internal/httpapi/continuity_routes_test.go::TestTask23ApproveAndRevokeRequireSignedActiveDeviceRequest`
   - Cross-account approval is rejected by `TestApprovalRejectsCrossAccountTarget`.

2. **Existing Web device approves new mobile device via protocol vector — PASS.**
   - `web/src/account/trusted-devices.test.ts` verifies the frozen Task-19 Web-to-mobile transfer vector byte-for-byte, including transfer-key derivation and vault-root-secret unwrap.
   - Substituted source/target identity metadata fails authentication.

3. **Recovery key restores vault after all trusted devices are lost — PASS.**
   - `web/src/account/recovery.test.ts` derives the frozen Task-19 recovery wrapping key and unwraps the recovery envelope to the exact frozen vault-root-secret vector.
   - Tampered recovery ciphertext fails closed.

4. **Email/SMS-only account recovery cannot unwrap the old vault — PASS.**
   - `web/src/account/recovery.test.ts` explicitly verifies that account-credential bytes cannot substitute for the independent recovery secret.
   - The continuity HTTP read returns only the opaque recovery wrapper; it never returns plaintext vault keys.

5. **Revoked device cannot fetch new sync generations — PASS.**
   - `sync_service/internal/continuity/service_test.go::TestRevokedDeviceCannotAuthorizeFutureSync` verifies the device state transition and authorization rejection.
   - `sync_service/internal/sync/pull_test.go::TestPullPropagatesRevokedDeviceRejection` proves the rejection at the actual sync pull boundary before new ciphertext events are returned.

6. **Account deletion removes server-side account/ciphertext without claiming former-device erasure — PASS.**
   - `sync_service/internal/continuity/service_test.go::TestAccountDeletionReceiptDoesNotClaimFormerDeviceErasure`
   - `sync_service/internal/httpapi/continuity_routes_test.go::TestTask23DeleteAccountReturnsTruthfulServerOnlyReceipt`
   - The receipt records `server_state_deleted=true` and `former_device_copies_erased=false`; no remote-wipe claim is made.

## Security and privacy boundaries preserved

- Recovery wrappers remain ciphertext-only opaque material on the server.
- Approval, revocation, recovery-wrapper update, and account deletion are signed continuity mutations.
- Invalid device signatures block mutation.
- Challenge scopes are server-derived from the authenticated account/device and requested action.
- Recovery-wrapper update authorization hashes the exact raw HTTP body.
- Sensitive continuity responses are marked `Cache-Control: no-store`.
- The server does not claim to erase exports or former-device copies it no longer controls.
- Account credentials, email, or SMS verification are not treated as vault-root-secret recovery material.
- The Task-19 suite and interoperability vectors remain unchanged and pass on the exact Task-23 closure SHA.

## TDD and final-audit evidence

- The complete HTTP/page/passkey RED contract was frozen at `54c02652922592178578173676bb1f1ee7d7c289`; Go failed on missing continuity HTTP symbols and Web failed on the deliberately absent passkey/page production modules before GREEN implementation.
- Durable continuity persistence was separately proven GREEN earlier at `bdeac91d6a9ed23af0b6c1f4a6f9f0efa1b20a41`, dedicated run `35180721830`, before the HTTP/page slice continued.
- Final integration audit at `41a4e438811aabe34b9875ba962191123e5b47f2`, run `35181661154`, correctly caught two TypeScript 6 unsafe WebAuthn entity casts while the Go half stayed green.
- The decoder root cause was fixed by validating required relying-party/user fields rather than hiding the error behind a double cast.
- Exact-head verification then passed at `71ef29435b73da956a6e413f5b9aac1407a5937d` in Task-23 run `35182398133` and Task-19 run `35182398167`.
- A stale historical RED-sentinel comment was removed without changing behavior; the final authoritative implementation baseline `325c3775578fb860853b0be23ea728190ba05243` was fully reverified by runs `35182542037` and `35182542212`.

## Scope boundary

Task 23 closes the **trusted-device approval and independent recovery-key continuity boundary**. It does not claim production email/SMS-provider deployment, remote wiping of former devices, erasure of user-controlled exports, or physical end-user acceptance on a real device. Mobile account/sync adapters begin in Task 24. Physical wife/staged acceptance remains a later Task-28 activity and must not be inferred from this closure.
