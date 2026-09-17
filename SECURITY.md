# Security Policy

Sreva handles sensitive reproductive-health information. Security defects affecting confidentiality, integrity, authentication, recovery, backup/restore, notification privacy, release signing, synchronization authorization, browser-vault protection, or data deletion are release blockers for the affected release.

## Cross-platform security model

Sreva is one product with Android, iOS, and Web/PWA as equal first-class clients. Different platform security mechanisms are expected, but the clients must conform to the same privacy/data semantics and approved cryptographic formats.

The authoritative cross-platform architecture is `docs/superpowers/specs/2026-09-16-sreva-web-product-architecture-design.md`.

## Non-negotiable rules

1. Never log menstrual dates, symptoms, notes, fertility data, sexual activity, pregnancy state, medication details, HealthKit/Health Connect payloads, decrypted sync payloads, recovery secrets, or sensitive health search terms.
2. Never add an analytics, advertising, crash-session replay, remote logging, cloud-AI, or tracking SDK without an explicit privacy/security architecture review.
3. Native device secrets belong in Keychain / Android Keystore-backed storage where applicable. Web secrets use reviewed WebCrypto/WebAuthn/browser-protection mechanisms and must not be represented as equivalent to secure hardware unless that is actually true.
4. Backups must be encrypted before leaving the application-controlled health boundary.
5. Database/vault migrations must be transactional or equivalently fail-safe and validated.
6. Changes touching cryptography, E2EE sync, authentication/recovery, HealthKit/Health Connect, backup/restore, migrations, notifications, browser persistence, service workers, privacy, or release signing require targeted tests.
7. Do not commit signing keys, App Store Connect keys, Play signing keys, provisioning profiles, store credentials, backend administration credentials, SMS/email provider secrets, recovery keys, vault secrets, private artifact passwords, or real user data.
8. Sensitive health values must not appear in URLs/query strings, ordinary browser caches, service-worker caches, client telemetry, or unencrypted network payloads.
9. Account authentication is not health-vault decryption. Email/SMS recovery alone must not unlock old E2EE health history.
10. Sreva infrastructure must not hold a universal/developer-accessible key capable of decrypting users' reproductive-health vaults.

## Implemented E2EE continuity boundary

Optional encrypted continuity is implemented behind the reviewed C2 protocol boundary. An authorized client encrypts health content before network transmission. The service operates on ciphertext, wrapped key/recovery material, and minimum operational metadata required for account/device authorization, versioning, sequencing, replay protection, synchronization, and revocation.

The server may know opaque account/device/object identifiers, public device-verification material, sizes, versions/revisions, minimum timestamps, and authorization/revocation state. It must not parse or store readable reproductive-health payloads. Sreva infrastructure does not possess the health-vault decryption key.

The frozen protocol includes:

- a versioned cross-platform key hierarchy;
- per-device cryptographic identity and enrollment semantics;
- trusted-device authorization;
- independent user-held recovery-key semantics;
- server-visible metadata boundaries;
- revocation and rotation behavior;
- replay/tamper/cross-account-substitution protections;
- algorithm/version agility;
- Android ↔ iOS ↔ Web interoperability vectors;
- threat-model and protocol-review evidence.

Passkey/account authentication and email/SMS account recovery are separate from vault decryption. A trusted device or independent recovery key is required for old-vault continuity. Loss of every trusted device plus the recovery key can make the old encrypted vault unrecoverable.

## Web/PWA security boundary

The Web client is browser-native Next.js/React/TypeScript and therefore has additional attack surfaces. Security review includes at least:

- XSS and unsafe HTML/script injection;
- CSP/security-header posture at production hosting;
- clickjacking;
- CSRF where applicable to authenticated service endpoints;
- token/session leakage and fixation;
- service-worker compromise and unsafe cache rules;
- IndexedDB/browser-storage confidentiality and integrity;
- malicious browser-extension boundary;
- Web Push metadata/content privacy;
- dependency/supply-chain compromise;
- sensitive state leaking into URLs, browser history, logs, or caches.

Anything shipped in the browser bundle is treated as public. Backend/service credentials, private keys, provider secrets, and administrative tokens never belong in Web build variables.

## Sync-service security boundary

The sync service may store only opaque account/device identifiers, ciphertext/wrapped key material, versions, minimum timestamps/operational metadata, and authorization state required by the reviewed protocol. Its schema/API must not grow readable fields such as period dates, symptoms, pregnancy state, sexual activity, fertility observations, medication details, notes, or prediction results.

Authorization, concurrency, replay protection, revoked-device handling, cross-account isolation, idempotency, ciphertext limits, and truthful account deletion are mandatory test areas.

Account deletion may remove server-controlled state but must never claim remote erasure of former-device copies or user-controlled exports/backups.

## Sync-enabled release declaration gate

A **sync-enabled release** is blocked if its shipping behavior and its public disclosures disagree. Any mismatch between the implementation and the public/in-app privacy policy, Privacy Center, support text, or an applicable store declaration is a **release blocker**.

Before such a release:

1. Run the complete protocol, interoperability, account/device/recovery, sync-service, mobile-adapter, Web, and cross-platform traceability gates.
2. Review the privacy policy and in-product wording against the actual enabled data flows.
3. Re-evaluate Google Play Data Safety and Health app declarations using the **exact release binary** and dependency lockfiles.
4. When native iOS distribution is active, re-evaluate Apple App Privacy disclosures against the same exact release behavior and dependency set.
5. Review email/SMS provider metadata only if those provider channels are enabled in that release.
6. Preserve account-free core health functionality and prove disabling sync leaves the local vault usable.

Repository CI can prove repository-controlled tests and documents. It cannot prove that an external Play Console/App Store Connect form, publisher identity step, production provider account, or final store review has been completed.

## Public repository release boundary

This repository is public source. Public CI is verification-only for installable native application binaries: Android and iOS builds may be compiled and tested, but normal CI must not publish ordinary APK, AAB, or unsigned iOS application bundles as downloadable artifacts.

Production and family-preview Android releases are manually dispatched from the canonical repository on `main`. Signing credentials and release-artifact encryption passwords are environment-scoped GitHub secrets. Signed release payloads must be encrypted before any Actions artifact upload, and decoded keystores plus plaintext staging material must be removed in an `always()` cleanup step.

External GitHub Actions used by Sreva workflows must be pinned to immutable commit SHAs. Workflow permissions remain least-privilege unless a separately reviewed job proves broader permissions are necessary. Future GitHub Pages deployment may require Pages/OIDC permissions only in the dedicated deployment job; sync-service secrets must never be exposed to the static Web build.

The maintained public-repository protection state and release-boundary rationale are documented in `docs/security/PUBLIC_REPOSITORY_HARDENING.md`.

## Verification rule

Existing mobile security/CI gates remain mandatory. C2 shared-contract, Web/PWA, sync-service, account/recovery, traceability, and release-policy gates are additive; none replaces a stronger existing gate with a weaker generic one.

Do not publish vulnerability reports containing secrets, real health data, signing material, recovery material, or private user exports in a public issue.
