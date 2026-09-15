# Sreva

**A private, local-first women's cycle companion.**

> Internal dedication: **Sreedevi Nallan Chakravathy.** Public product name: **Sreva**.

Sreva is designed so menstrual and reproductive-health data remains on the user's device. Core tracking, prediction, reminders, insights, reports, and assistant intent parsing are local-first and usable without an account or internet connection.

## Product principles

- Device is the authoritative health datastore.
- No developer-operated reproductive-health database.
- Core features work offline and without an account.
- Predictions and insights run on-device.
- Period reminders use OS-local scheduling.
- HealthKit / Health Connect access is granular and opt-in.
- Sensitive health values never enter normal logs or analytics.
- Updates are distributed as signed application releases.
- Database migrations are transactional and preserve history.
- V1 is a wellness/tracking product, not a diagnostic or contraceptive medical device.

## Worldwide v1.0

The repository release line is **Sreva 1.0.0+1**. Android is the first production-distribution priority; iOS remains fully compiled and adapter-verified without production Apple signing until an Apple Developer membership is available.

Android release engineering includes:

- Android API 36 compile/target enforcement;
- native Kotlin Health Connect, reminder, privacy and offline-voice bridges;
- DST/time-zone wall-clock reminder regression tests;
- production upload-key signing path with no committed signing secrets;
- release AAB and APK construction;
- AAB/APK signature verification;
- OSV dependency scanning;
- CycloneDX SBOM generation;
- SHA-256 release checksums in the production workflow;
- Google Play health/privacy/compliance runbooks.

The normal CI uses an ephemeral test signing key only to prove the complete release-signing pipeline. The manually dispatched production workflow requires the publisher's real Google Play upload key through protected GitHub secrets.

## Targets

- Android: minimum API 26; Play compile/target API 36 for the v1 release pipeline.
- iOS: minimum iOS 17; unsigned release compilation remains continuously verified.
- Flutter toolchain: 3.47.2 / Dart 3.13.2.

## Release and compliance documentation

- Master product specification: `docs/superpowers/specs/2026-09-15-sreva-master-design.md`
- Implementation plan: `docs/superpowers/plans/2026-09-15-sreva-v1-implementation.md`
- Android production runbook: `docs/android/PLAY_PRODUCTION_RUNBOOK.md`
- Google Play compliance checklist: `docs/android/PLAY_COMPLIANCE_CHECKLIST.md`
- Publishable privacy-policy page source: `docs/android/privacy-policy.html`
- Security policy: `SECURITY.md`
- Privacy architecture: `PRIVACY.md`

## Repository safety rules

Do not commit real health data, diagnostic exports containing health values, Android/iOS signing materials, store credentials, recovery secrets or private user backups.

Every privacy, cryptography, migration, reminder, Health Connect/HealthKit, backup/restore or release-signing change requires targeted verification. A red CI gate is a release blocker.
