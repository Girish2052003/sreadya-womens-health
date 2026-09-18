# Sreva

**One private, local-first women's cycle and wellness companion across Android, iOS, and Web/PWA.**

> In honour of **Sreedevi Girish Nallan Chakravathy**. Public product name: **Sreva**.

Sreva is designed as **one product with three equal first-class clients**:

- **Android** — Flutter/Dart + Android-native adapters;
- **iOS** — Flutter/Dart + iOS-native adapters;
- **Web/PWA** — Next.js + React + TypeScript, usable in a browser or as an installable PWA where supported.

The clients may use different operating-system mechanisms, but they are governed by one capability contract, one privacy model, one set of health semantics, and shared conformance vectors. Platform limitations may change the mechanism; they must not quietly create a weaker Sreva edition.

## Current repository status

The **implemented production baseline today** is the Flutter Android/iOS client. Android is the current native production-distribution priority and uses package `com.sreva.health.sreva` with release line `1.0.0+1`. iOS remains a first-class client and is continuously compiled/adapter-verified without production Apple signing until publisher signing/App Store capability is available.

The **approved next architecture** adds a browser-native Next.js/React/TypeScript Web/PWA client, shared language-neutral contracts, and optional end-to-end encrypted account continuity. Those C2 additions are documented and planned, but they must not be described as already implemented or shipping until the corresponding code, tests, privacy disclosures, and release gates are complete.

This distinction is deliberate: the approved architecture is ahead of the currently shipping runtime, and documentation must remain truthful about both.

## Product principles

- **One Sreva:** Android, iOS, and Web/PWA are equal first-class clients.
- **Account-free is first-class:** core health functionality works without an account.
- **Offline-first:** core tracking, history, predictions, insights, reports, and local logging remain usable without Internet where the platform permits.
- **Local intelligence:** predictions and personal insights run on the authorized client.
- **Local plaintext ownership:** reproductive-health information is not maintained in a Sreva-operated plaintext or developer-decryptable health database.
- **Optional E2EE continuity:** approved account mode may synchronize ciphertext plus minimum operational metadata across Android, iOS, and Web. Sreva infrastructure must not possess the health-vault decryption key.
- **Account equality:** an account adds encrypted continuity and recovery conveniences, not superior health features.
- **Adaptive reminders:** one reminder policy, with native Android/iOS scheduling and honest Web/PWA/browser-adapted delivery.
- **Explicit health integrations:** HealthKit and Health Connect are native, granular, opt-in integrations—not fake Web APIs.
- **No sensitive telemetry:** health values never enter ordinary logs, analytics, session replay, or default diagnostics.
- **Safe evolution:** local migrations and restores are validated and fail-safe.
- **Regulatory firewall:** V1 is wellness/tracking software, not a diagnostic or contraceptive-effectiveness medical device.

## C2 cross-platform architecture

```text
                         SREVA MONOREPO
                              │
             ┌────────────────┴────────────────┐
             │                                 │
             ▼                                 ▼
      MOBILE APPLICATIONS                  WEB PRODUCT
       Flutter / Dart              Next.js + React + TypeScript
             │                                 │
        Android + iOS                   Browser + PWA
             │                                 │
             └───────────────┬─────────────────┘
                             │
                  CANONICAL SHARED CONTRACT
                             │
          capabilities / schemas / semantics
          prediction / reminders / crypto
          sync protocol / terminology / vectors
```

The approved internal capability contract contains **18 launch families and 258 atomic engineering requirements**, plus separately tracked future/optional capabilities. Public marketing may continue to use a simpler “40+ capabilities” description; the 258 count is an anti-drift engineering ledger, not a marketing gimmick.

## Privacy and account boundary

### Account-free mode

- full core Sreva;
- encrypted local vault;
- offline operation;
- no Sreva account or sync service required.

### Optional account mode

- the same core health functionality;
- the same local encrypted vault;
- optional E2EE multi-device continuity;
- email-only, mobile-only, or both as account identifiers;
- mobile number is optional;
- passkey-first authentication;
- trusted-device approval + user-held recovery key;
- email/SMS may recover account identity but must not independently decrypt old health history.

The currently implemented `1.0.0+1` mobile runtime remains local-first and does **not** silently gain a sync backend merely because the future architecture is documented. A sync-enabled release requires implementation, protocol/security review, conformance tests, and updated privacy/store declarations first.

## Existing mobile release engineering

Android release engineering currently includes:

- Android API 36 compile/target enforcement;
- native Kotlin Health Connect, reminder, privacy and offline-voice bridges;
- DST/time-zone wall-clock reminder regression tests;
- production upload-key signing path with no committed signing secrets;
- release AAB and APK construction;
- AAB/APK signature verification;
- OSV dependency scanning;
- CycloneDX SBOM generation;
- SHA-256 release checksums in the controlled release payload;
- Google Play health/privacy/compliance runbooks.

The normal public CI uses ephemeral test signing keys only to prove the Android release-signing paths. It compiles and verifies Android and iOS but does **not** publish ordinary installable CI binaries. Manually dispatched production and family-preview workflows require environment-scoped signing secrets and encrypt signed release payloads before storing them as GitHub Actions artifacts.

## Current native targets

- Android: minimum API 26; Play compile/target API 36 for the v1 release pipeline.
- iOS: minimum iOS 17; unsigned release compilation remains continuously verified.
- Flutter toolchain: 3.47.2 / Dart 3.13.2.

The Web/PWA runtime and its pinned Node/Next/React/TypeScript toolchain are defined in the approved C2 implementation plan and are introduced during implementation—not retroactively assumed to exist today.

## Architecture and implementation documents

**Globalization authority:** `docs/architecture/SREADYA_GLOBALIZATION_ARCHITECTURE.md` is the single authoritative home for SREADYA language, locale, translation, provenance, fallback, and future content-scale rules. Implementation plans must cross-reference it rather than redefine those rules.

The authority chain is:

1. **Cross-platform constitution:** `docs/superpowers/specs/2026-09-16-sreva-web-product-architecture-design.md`
2. **C2 consistency audit:** `docs/superpowers/specs/2026-09-16-sreva-c2-consistency-audit.md`
3. **Cross-platform implementation plan:** `docs/superpowers/plans/2026-09-16-sreva-c2-cross-platform-implementation.md`
4. **Mobile baseline companion:** `docs/superpowers/specs/2026-09-15-sreva-master-design.md`
5. **Mobile baseline implementation record:** `docs/superpowers/plans/2026-09-15-sreva-v1-implementation.md`

Platform-specific release/compliance documents remain authoritative for their release channel but must obey the cross-platform constitution.

Additional documentation:

- Android production runbook: `docs/android/PLAY_PRODUCTION_RUNBOOK.md`
- Google Play compliance checklist: `docs/android/PLAY_COMPLIANCE_CHECKLIST.md`
- Publishable Android privacy-policy source: `docs/android/privacy-policy.html`
- Public-repository security posture: `docs/security/PUBLIC_REPOSITORY_HARDENING.md`
- Security policy: `SECURITY.md`
- Privacy architecture: `PRIVACY.md`

## Repository safety rules

Do not commit real health data, health-bearing diagnostic exports, Android/iOS signing materials, store credentials, account recovery secrets, E2EE vault secrets, private user backups, SMS/email provider secrets, or production backend credentials.

Every privacy, cryptography, migration, reminder, Health Connect/HealthKit, backup/restore, identity/recovery, sync protocol, browser vault, service-worker caching, or release-signing change requires targeted verification. A red relevant gate is a release blocker.
