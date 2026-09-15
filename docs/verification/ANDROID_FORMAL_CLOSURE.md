# Sreva Android v1 Formal Closure Ledger

Status: **PENDING — do not claim closure until every mandatory gate below is green on `main`.**

Release candidate: Sreva `1.0.0+1`

Source implementation parent: `70f2c271bd66e7c5d127ed6d75fb02eaf58f492d`

## Frozen product laws

1. The user's device is the authoritative health datastore.
2. Core functionality requires no account.
3. Core functionality requires no Internet.
4. Predictions execute locally.
5. Insights execute locally.
6. Period reminders use local OS scheduling.
7. Sreva operates no developer reproductive-health database.
8. Health integrations require granular explicit permission.
9. Sensitive health data never enters ordinary logs or analytics.
10. Application updates use signed distribution channels.
11. Database migrations preserve and validate existing history or fail safely.
12. Medical/contraceptive claims remain outside v1 unless separately validated and regulated.

## Mandatory source and product evidence

- Encrypted local SQLite/SQLCipher-class Health Vault with device-protected key material.
- Safe database migration coordinator with pre-migration recovery snapshot and integrity validation.
- Local period/cycle history and structured observations.
- Local prediction engine with versioned prediction history and uncertainty window.
- Local reminder policy with three-day-before support and privacy modes.
- Android native reminder scheduling with timezone/DST wall-clock preservation.
- Android Health Connect adapter behind explicit permissions and provenance/de-duplication boundaries.
- Local insights and doctor report generation with preview-before-share.
- User-controlled encrypted CycleVault export/restore.
- App lock, PIN fallback, sensitive-screen protection, privacy center, and full local wipe.
- Local natural-language logging and offline voice boundary.
- Manual privacy-controlled partner sharing only; no developer relay in v1.
- Publishable and in-app privacy policy.
- No advertising/behavioral analytics SDK or developer health-payload telemetry.

## Mandatory automated verification gates

All must pass from the same candidate tree before merge:

- `dart format --set-exit-if-changed`
- `flutter analyze`
- complete `flutter test`
- Python tool syntax checks
- reference/structural closure tests
- privacy scan
- committed-secret scan
- OSV dependency vulnerability scan
- CycloneDX SBOM generation
- Android host generation and native bridge installation checks
- Play target API/release-signing policy checks
- Kotlin release unit tests including Helsinki DST forward/backward reminder cases
- Kotlin worldwide timezone database and travel/timezone-change wall-clock tests
- editable quiet-hours policy controls
- Health Connect history permission and supported read/write symmetry
- CycleVault cryptographic round-trip, wrong-passphrase, tamper, format and atomic-failure tests
- prediction calibration including over/under-confidence signals
- complete deterministic local-assistant intent-family tests
- ephemeral non-debug release-signing path verification
- signed release AAB build
- signed release APK build
- AAB signature verification
- APK signature verification
- iOS release compile without code signing (non-blocking for Android commercial launch but mandatory for shared-code regression closure)

## Current closure audit

The production patch closing the audited worldwide-v1 gaps has been applied and canonically formatted. The expanded acceptance suite remains authoritative and must now prove the candidate green end-to-end. No gate may be deleted or weakened merely to obtain a green build.

## Final repository gates

Closure is valid only after:

1. The verified candidate is fast-forwarded/merged to `main` without changing the tree.
2. The full CI suite passes again on `main`.
3. `main` is the repository default branch.
4. Every remote branch other than `main` is deleted.
5. A fresh branch inventory proves that only `main` remains.
6. The Android production release workflow exists on `main`, checks out `main`, requires the real publisher upload-key secrets, builds signed Play artifacts, verifies signatures, emits checksums/SBOM, and never stores the production keystore in the repository.

## Evidence rule

A feature is not considered closed because code exists. It is closed only when the corresponding executable verification gate passes. A red, skipped, or unevaluated mandatory gate keeps this ledger **PENDING**.
