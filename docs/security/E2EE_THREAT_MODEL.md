# Sreadya E2EE Threat Model v1

**Scope:** optional Sreadya account/device continuity and ciphertext synchronization designed in Task 19. This document does not claim a third-party audit or a proof of cryptographic security.

## 1. Assets

Confidential assets include health plaintext and local interpretations, VRS and historical epochs, user-held RS, one-time TS, Ed25519 device private keys, local storage wrapping keys, and decrypted CycleVault content. Integrity assets include device authorization, encrypted event history, revision/conflict state, recovery/enrollment lifecycle state, protocol/suite/key-epoch metadata, and account/vault/device bindings. Availability assets include complete account-free local use, local authoritative state, CycleVault backup/restore, and optional sync continuity.

## 2. Trust boundaries

**Authorized client:** trusted to hold plaintext while unlocked and perform encryption/decryption. Platform keystores, browser storage, OS sandboxing, device biometrics, and WebAuthn have platform-specific limits.

**Sreadya sync/identity service:** trusted for account authorization, device state, sequencing, opaque metadata, and ciphertext transport. It is **not trusted with health plaintext or VRS/RS/TS**.

**Network:** untrusted. HTTPS is mandatory; ciphertext integrity and device request signatures provide additional application-layer controls.

**Recovery/transfer channel:** RS is user-controlled. TS is delivered directly between devices, normally by explicit QR scan. Possession of an active correctly scoped RS/TS is security-sensitive.

## 3. Adversaries in scope

### Stolen or compromised device
A stolen authorized device may contain secrets or plaintext. Local app/OS protections reduce exposure but do not guarantee safety after compromise/unlock. Revocation blocks future authorization but cannot erase material already obtained.

### Malicious partner/family/acquaintance
Physical proximity or knowledge of contact details grants no automatic access. Enrollment still requires explicit trusted-device approval or RS.

### Account takeover
Email/SMS/session/passkey account compromise alone must not reveal the old E2EE vault because account authentication does not derive VRS. A new device still needs trusted transfer or RS-based recovery.

### Sync database or administrator compromise
An attacker may obtain ciphertext, wrapped VRS recovery envelopes, Ed25519 public device keys, opaque IDs, sizes, versions, timestamps, and authorization state, and may alter server-visible state. Server material must not legitimately derive VRS. A malicious server can still deny, suppress, reorder, delete, or serve stale ciphertext; clients preserve local authoritative state rather than treating server state as plaintext truth.

### Authorization/session bug
Cross-account/cross-device mistakes are mitigated by explicit authorization plus cryptographic account/vault/object/device binding. Cryptography does not excuse broken authorization; both are required.

### Replay/tamper/substitution
Single-use challenges/enrollments, event idempotency/revisions, Ed25519 request signatures, and AES-GCM AAD/tag verification must reject or neutralize replays, altered bodies, and cross-context ciphertext substitution before plaintext application.

### Device impersonation
Knowing a device ID or public key is insufficient without the private Ed25519 signing key. Theft of that private key is treated as device compromise until revocation.

### Recovery abuse
Email/SMS identity recovery alone cannot decrypt old vault data. RS is independent high-entropy material rather than a server-verifiable low-entropy password.

### Browser XSS, malicious extension, service-worker compromise
In-browser E2EE cannot protect plaintext from code executing with equivalent page privileges while the vault is unlocked. CSP, dependency controls, code review, service-worker integrity/update discipline, and minimal dependencies remain release-critical.

### Rooted/jailbroken/fully compromised OS
Outside the guarantee boundary. Sreadya can reduce exposure but cannot guarantee secret secrecy against a runtime/OS-level attacker.

### Dependency/supply-chain compromise
Malicious client dependencies may steal plaintext/secrets. Lock files, dependency review, SBOM, secret/privacy scans, and minimized cryptographic dependencies are mandatory release controls.

## 4. Security properties intended by v1

1. Server cannot normally decrypt health ciphertext; required secret material is client/user held.
2. Account authentication alone is insufficient to decrypt old health history.
3. A new device requires authorized trusted-device transfer or RS.
4. Loss of all authorized device secret material plus RS makes old E2EE vault unrecoverable; there is no administrator escrow key.
5. Ciphertext tampering/context substitution is authenticated before plaintext application.
6. Revoked devices cannot perform future authorized sync operations; no retroactive-erasure claim is made.
7. Sync failure cannot become silent local health-data loss; local Sreadya remains authoritative and usable.
8. Conflicting health edits are not semantically resolved by the server.

## 5. Metadata not hidden

The service may learn that an account exists, device count/public keys, approximate ciphertext sizes, request timing/frequency, opaque object/event counts, key epochs, revocation state, and sync timestamps. v1 does not claim traffic-analysis resistance, anonymity, ORAM, private information retrieval, or metadata-hiding synchronization.

## 6. Availability and malicious-server limits

E2EE cannot stop the service from refusing requests, deleting server copies, withholding/delaying ciphertext, serving stale data, or suppressing notifications. Clients therefore retain local authoritative state, encrypted local queues, and CycleVault backup capability.

## 7. Cryptographic misuse risks

Production implementations must prevent AES-GCM nonce reuse under a key; test-vector secret reuse; weak/password-derived RS/TS; ad-hoc framing; unknown-suite acceptance; skipped tag verification; plaintext application before schema/domain validation; logging of secrets/plaintext/recovery codes; conversion of account credentials into vault-key material; and overlong enrollment-TS lifetime.

Ed25519 implementations MUST sign and verify the canonical transcript bytes defined by v1. They MUST NOT silently substitute Ed25519ph or an extra full-transcript SHA-256 pre-hash. SHA-256 is used for the request-body digest that is itself one canonical transcript field.

## 8. Privacy/logging boundary

Health plaintext, RS, TS, VRS, device private keys, and decrypted event content MUST NOT appear in ordinary server logs, analytics, crash reports, URLs, notification payloads, or public caches. Diagnostic telemetry, if later enabled under approved architecture, remains technical-only and must pass health-payload sentinel tests.

## 9. Physical/social threats

QR trusted-device transfer assumes the user can confirm the intended target in a trusted context. Shoulder surfing, screenshots, screen sharing, malicious camera apps, and coerced enrollment remain risks. UX must expose source/target identity, expiry, explicit approval, and cancellation. Recovery code UX should encourage private/offline storage and warn that the code plus account access can recover the encrypted vault.

## 10. Explicit non-claims

v1 does not claim protection after full client compromise while unlocked; retroactive deletion from a former authorized device; zero metadata leakage; deniability/anonymity; forward secrecy for records against compromise of retained historical VRS epochs; post-quantum security; formal cryptographic verification; or external audit approval.

## 11. Required verification before shipping sync

Task 19 freezes protocol contracts only. Later tasks must additionally prove implementation-level three-client interoperability, authorization isolation, replay/tamper/substitution negatives, trusted-device/recovery abuse cases, revoked-device behavior, offline/concurrent/conflict/tombstone semantics, dependency/SAST/secret/privacy/SBOM gates, browser XSS/CSP/service-worker review, and policy/store-disclosure alignment with the exact shipping build.
