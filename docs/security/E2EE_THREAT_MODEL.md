# Sreva E2EE Threat Model v1

**Scope:** optional Sreva account/device continuity and ciphertext synchronization designed in Task 19. This document does not claim a third-party audit or a proof of cryptographic security.

## 1. Assets

Primary confidential assets:

- health plaintext and locally derived health interpretations;
- Vault Root Secret (VRS) and historical VRS/key epochs;
- user-held Recovery Secret (RS);
- one-time trusted-device Transfer Secret (TS);
- device private signing keys;
- local device-vault/storage wrapping keys;
- decrypted CycleVault contents.

Integrity/authenticity assets:

- device authorization state;
- encrypted logical-event history;
- revision/conflict graph;
- recovery and enrollment lifecycle state;
- protocol/suite/key-epoch metadata;
- account-to-vault and account-to-device bindings.

Availability assets:

- local account-free health functionality;
- local authoritative health state;
- ability to export/restore CycleVault;
- optional sync continuity.

## 2. Trust boundaries

### Authorized client

Trusted to hold plaintext while unlocked and to perform local encryption/decryption. Platform key stores, browser storage, secure storage, OS sandboxing, device biometrics and WebAuthn are valuable controls but have platform-specific limits.

### Sreva sync/identity service

Trusted for account authorization, device state, sequencing, opaque metadata and reliable ciphertext transport. It is **not trusted with health plaintext or the VRS/RS/TS**. The design assumes it may be compromised and limits what such compromise should reveal.

### Network

Untrusted. HTTPS is mandatory, but protocol ciphertext integrity and device request signatures provide separate application-level protections for the defined operations.

### Recovery/transfer channel

The RS is controlled by the user. The trusted-device TS is delivered directly between devices, normally by an explicit QR scan. Anyone who obtains an active RS or TS within its valid context may gain the corresponding cryptographic capability; those secrets therefore require clear handling UX and short-lived TS validity.

## 3. Adversaries in scope

### Stolen or temporarily accessed device

Attacker may possess an authorized device. Local app lock, OS/device protection and secure storage reduce exposure but cannot guarantee safety after successful device compromise/unlock. Revocation blocks future service authorization but cannot remotely erase secrets/plaintext already obtained by the stolen device.

### Malicious partner, family member or acquaintance

May have physical proximity, know contact details, or see notifications/screens. There is no automatic spouse/partner access. Enrollment requires explicit trusted-device approval or the Recovery Secret. Generic notification/privacy modes remain separate controls.

### Account takeover

Attacker may gain email/SMS/account session or even account authentication. This must not by itself reveal the old E2EE vault because account authentication cannot derive the VRS. A new device still requires trusted-device transfer or RS-based recovery.

### Sync database breach

Attacker may obtain all server rows, ciphertext, wrapped VRS recovery envelope, public device keys, opaque identifiers, sizes, versions and timestamps. No health decryption key should be present server-side. Metadata leakage is minimized but not claimed to be zero.

### Rogue administrator / backend credential compromise

May read/modify server-visible state and ciphertext. Cannot legitimately derive VRS from server material. Tampering/substitution should be detected by authorization binding, device signatures, revisions and AES-GCM AAD/tag verification. A rogue service can still deny service, withhold events, reorder responses, lie about availability, or present stale ciphertext; clients must preserve local state and expose failures rather than silently deleting data.

### Authorization/session bug

Cross-account/cross-device mistakes are mitigated by explicit server authorization plus cryptographic binding of account/vault/object/device context. Cryptography does not excuse broken authorization; both are required.

### Replay attacker

May replay valid network messages, events, challenges or enrollment requests. Single-use challenges/enrollments, event idempotency and revision semantics reject or neutralize replays.

### Ciphertext tampering/substitution

May alter ciphertext, nonce, tag or authenticated metadata, or copy envelopes between accounts/vaults/objects. AES-GCM authentication plus AAD context binding must fail before plaintext application.

### Device impersonation

May know device ID but lacks its private P-256 signing key. Sensitive service mutations require a valid fresh challenge signature. Theft of the device private key is equivalent to device compromise until revocation.

### Recovery abuse

May trigger identity recovery or contact changes. Email/SMS-only recovery never decrypts the old vault. RS possession is powerful; repeated guesses are not made possible by server-held low-entropy material because RS is high entropy and independently generated.

### Browser XSS / malicious extension / compromised same-origin code

In-browser E2EE cannot protect plaintext from malicious code executing with equivalent page privileges while the vault is unlocked. CSP, dependency controls, code review, service-worker integrity/update discipline, minimal dependencies and future browser hardening are therefore critical. A malicious extension with broad page access may also cross the browser trust boundary.

### Service-worker compromise

Could tamper with application code or availability. Service workers must never cache plaintext health responses and update logic must preserve/validate the encrypted vault. E2EE is not a defense against fully compromised client code at plaintext-use time.

### Rooted/jailbroken/fully compromised OS

Outside the guarantee boundary. Sreva can reduce exposure but cannot guarantee key secrecy against an attacker controlling the OS/runtime.

### Dependency/supply-chain compromise

May introduce malicious client code capable of stealing secrets. Pinning, lock files, SBOM/dependency review, secret/privacy scans and minimizing cryptographic dependencies are mandatory release controls.

## 4. Security properties intended by v1

1. **Server cannot normally decrypt health ciphertext.** Required secret material is generated/held by clients/user.
2. **Account authentication alone is insufficient to decrypt old health history.**
3. **A new device requires either an authorized trusted-device transfer or user-held RS.**
4. **Loss of all authorized device secret material and RS means old E2EE vault is unrecoverable.** There is no administrator escrow key.
5. **Ciphertext tampering/context substitution is authenticated before plaintext application.**
6. **Revoked devices cannot obtain future authorized sync operations.** No retroactive-erasure claim.
7. **Sync failure cannot become silent local health-data loss.** Local Sreva remains authoritative and usable.
8. **Conflicting health edits are not semantically resolved by the server.** Ambiguous conflicts remain client/user decisions after decryption.

## 5. Metadata not hidden by this design

The service may learn operational facts including that an account exists, device count/public keys, approximate ciphertext sizes, request timing/frequency, opaque object/event counts, key epochs, revocation state and sync timestamps. v1 does not claim traffic-analysis resistance, anonymous credentials, ORAM, private information retrieval, or metadata-hiding synchronization.

Opaque identifiers prevent the schema from directly naming health semantics but do not make all usage patterns private.

## 6. Availability and malicious-server limitations

E2EE does not stop a server from:

- refusing requests;
- deleting server copies;
- withholding or delaying ciphertext;
- selectively serving stale data;
- exhausting rate/size limits maliciously;
- suppressing device notifications.

Clients therefore keep local authoritative state, encrypted local queues and CycleVault backup capability. Strong transparency/consistency mechanisms beyond the revision/conflict protocol are future work and must not be implied by v1.

## 7. Cryptographic misuse risks

Production implementations must prevent:

- AES-GCM nonce reuse under the same key;
- use of test-vector secrets/nonces;
- weak/password-derived RS or TS;
- ad-hoc string concatenation instead of canonical framing;
- accepting unknown suite/version/key epoch;
- skipping tag verification;
- applying decrypted data before schema/domain validation;
- logging secrets, plaintext, ciphertext bodies, recovery codes or signed request bodies;
- silently converting account credentials into vault-key material;
- keeping an enrollment TS valid longer than required.

## 8. Privacy and logging boundary

Health plaintext, RS, TS, VRS, device private keys and decrypted request/event content MUST NOT appear in ordinary server logs, analytics, crash reports, URLs, notification payloads or public caches.

Diagnostic telemetry, if later enabled under the approved privacy architecture, is limited to technical state and must pass existing health-payload sentinel tests.

## 9. Physical/social threats

QR trusted-device transfer assumes the user can compare/confirm the intended target in a physically or socially trusted context. Shoulder surfing, screenshots, screen sharing, malicious camera apps and coerced enrollment remain risks. UX must show source/target identity, expiry and explicit approval and must allow cancellation.

Recovery code UX should encourage offline/private storage and warn that anyone holding the code plus account access can recover the encrypted vault.

## 10. Explicit non-claims

v1 does not claim:

- protection after full client compromise while unlocked;
- retroactive deletion from a previously authorized device;
- zero metadata leakage;
- deniability or anonymity;
- forward secrecy for already synchronized records against compromise of a retained historical VRS epoch;
- post-quantum security;
- formal verification of the cryptographic protocol;
- external security-audit approval.

Any future claim in these areas requires separate design, implementation and evidence.

## 11. Required verification before shipping sync

Task 19 only freezes protocol contracts. Before shipping account/sync, later tasks must additionally prove:

- three-client golden-vector interoperability;
- authorization isolation and cross-account negative tests;
- replay/tamper/substitution negative tests;
- trusted-device and recovery loss/abuse scenarios;
- revoked-device behavior;
- offline/concurrent/conflict/tombstone convergence behavior;
- dependency, SAST, secret, privacy and SBOM gates;
- browser XSS/CSP/service-worker review;
- policy/store disclosure alignment with the exact shipping build.
