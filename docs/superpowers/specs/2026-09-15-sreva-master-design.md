# Sreva Master Product Specification v1.0

**Date:** 2026-09-15  
**Public product name:** Sreva  
**In honour of:** Sreedevi Nallan Chakravathy  
**Primary launch device:** iPhone 17  
**Minimum iOS target:** iOS 17  
**Platforms:** iOS and Android  
**Architecture:** Local Sovereign Core + Optional Privacy-Preserving Extensions

## 1. Product promise

Sreva is a full women's cycle companion whose intelligence lives with the woman, not in a developer-operated health database. It must be genuinely useful for daily menstrual-cycle management while remaining understandable, private, reliable, and updateable like a production mobile product.

The app must never present a predicted period date as biologically guaranteed. Predictions are estimates with an explicit likely window and confidence level.

## 2. Architectural laws

1. The user's device is the authoritative reproductive-health datastore.
2. Core functionality requires no account.
3. Core functionality requires no internet connection.
4. Predictions execute locally.
5. Insights execute locally.
6. Period reminders use local OS scheduling.
7. The operator maintains no reproductive-health database for core app operation.
8. HealthKit / Health Connect integration is granular, explicit, and optional.
9. Sensitive health values never enter ordinary logs or analytics.
10. App updates are signed and distributed through platform release channels.
11. Every database migration is transactional, validated, and preserves history.
12. V1 is menstrual health tracking and wellness software, not diagnostic software and not a contraception-effectiveness product.

## 3. Production technology

- Flutter 3.47.2 / Dart 3.13.2.
- Modular clean architecture, feature-oriented directory structure.
- Riverpod for state management.
- Declarative routing.
- SQLite with Drift for local persistence.
- SQLCipher-class encrypted database implementation, with a random database key protected by Keychain / Android Keystore.
- Swift platform adapter for HealthKit, UserNotifications, LocalAuthentication, app-switcher privacy, and other iOS APIs.
- Kotlin platform adapter for Health Connect, Android notification scheduling, biometrics, boot/time-zone rescheduling, and related APIs.
- Local PDF and CSV report generation.
- Local cryptography for CycleVault backups using audited primitives.
- No cloud LLM required for core assistant functions.

## 4. Capability matrix — worldwide v1.0

The worldwide v1.0 release contains all capability families below. Platform-specific capability is shown only where the operating system supports it.

### 4.1 Home and onboarding

- No-account onboarding.
- Privacy-first explanation before permissions.
- Add historical periods manually.
- Optional import from platform health store.
- Select cycle/life-stage mode.
- Configure default 3-day reminder and notification privacy.
- Home summary: predicted date, likely window, confidence, quick log, period started, calendar.

### 4.2 Cycle and period tracking

- Start period today or on another date.
- End period.
- Edit or delete historical entries.
- Flow levels: spotting, light, medium, heavy.
- Period-day timeline.
- Cycle length and period duration.
- Irregular-cycle support.
- Month, timeline, and yearly history views.

### 4.3 Prediction engine

- Next likely period date.
- Prediction window.
- Confidence level.
- Recent-cycle weighting.
- Robust handling of outliers and incomplete cycles.
- Period-duration estimate.
- Prediction history and algorithm version.
- Wider uncertainty for irregular cycles.
- Local evaluation metrics after actual outcomes are known.

### 4.4 Reminder engine

- Default 3-day-before reminder.
- Optional 7-day, 1-day, expected-day, and late reminders.
- Medication, supplement, contraception, ovulation-test, and pregnancy-test reminders.
- User-selected reminder time.
- Quiet hours and snooze.
- Privacy modes: maximum, balanced, detailed.
- Rebuild reminders after prediction change, time-zone change, DST change, app update, permission changes, and device reboot where platform permits.
- Reminder Health diagnostic screen.

### 4.5 Daily health logging

- Cramps, headache/migraine, back pain, breast tenderness, bloating, acne, nausea, digestion, fatigue, dizziness, appetite/cravings, sleep, energy, stress, mood, anxiety/irritability, libido, vaginal discharge, cervical mucus, basal body temperature, weight, exercise, water, custom symptoms.
- Severity values and free-text notes.

### 4.6 Reproductive observations

- Ovulation-test records.
- Pregnancy-test records.
- Basal body temperature.
- Cervical mucus.
- Sexual activity and protection-used record, fully optional.
- Contraception context.
- Fertility observations.
- Trying-to-conceive mode.
- No V1 contraceptive-effectiveness claim.

### 4.7 Life-stage modes

- Cycle tracking.
- Trying to conceive.
- Pregnancy.
- Postpartum.
- Breastfeeding context.
- Perimenopause.
- Menopause transition.
- Hormonal contraception context.
- Mode changes never delete historical records.

### 4.8 Insights

- Average cycle length and period duration.
- Cycle variation, shortest/longest cycle.
- Flow patterns.
- Symptom, PMS, mood, pain, sleep, and energy trends.
- Local correlations presented as observations, not causes or diagnoses.
- Explainable insight source and date range.

### 4.9 Doctor / healthcare reports

- User selects date range and data categories.
- Local PDF and CSV generation.
- Preview before share.
- Sexual activity/private notes excluded by default.
- No server report generation.

### 4.10 Ultra-easy interaction

- Tap-based logging.
- Natural-language local commands such as “my period started yesterday,” “yesterday was heavy,” and “show my last six periods.”
- Ambiguous commands require confirmation.
- Voice uses on-device recognition when available; otherwise it is disabled rather than silently uploading sensitive speech.

### 4.11 Partner sharing

- User-controlled only.
- V1 zero-backend share through OS share sheet and QR/export summary.
- Per-category sharing controls.
- Sexual activity, notes, fertility, pregnancy, or symptom data are never automatically shared.
- Architecture exposes a `PartnerTransport` interface for a later separately reviewed E2EE live mode.

### 4.12 Platform health integration

- iOS: HealthKit read/write for supported reproductive types with granular authorization.
- Android: Health Connect read/write for supported reproductive types with granular authorization.
- Provenance and external IDs prevent duplicate import.
- Platform health stores are integrations, not the app's authoritative core database.

### 4.13 Accessibility and worldwide readiness

- Light/dark mode.
- Dynamic text.
- VoiceOver / TalkBack semantics.
- High contrast and colour-safe status design.
- One-handed interaction.
- Localization architecture.
- RTL readiness.
- Locale-specific dates.
- 12/24-hour time.
- Metric/imperial support.
- Offline operation and graceful poor-network behavior.

### 4.14 Privacy center and app lock

- Face ID / Touch ID / Android biometrics where available.
- PIN fallback architecture.
- Automatic lock.
- App-switcher privacy overlay on iOS and equivalent safeguards where available.
- Notification privacy control.
- Data-type transparency: location, purpose, sharing, platform integration, delete option.
- Delete individual records and wipe all Sreva data.
- No developer health account required.

### 4.15 CycleVault backup and restore

- Local encrypted archive.
- Versioned manifest.
- Authenticated encryption.
- User-chosen destination only after explicit export.
- Restore decrypts into a temporary database, validates integrity/schema/domain invariants, then atomically replaces live storage.
- Restore failure leaves original data untouched.

### 4.16 Database migrations

- Versioned schema.
- Local pre-migration recovery state.
- Transactional migration.
- SQLite integrity checks and domain validation.
- Rollback on failure.
- Tests cover adjacent and skipped-version upgrade paths.

### 4.17 Diagnostics and crash support

- User-visible diagnostic report contains app/OS/schema/engine versions, permissions, scheduler state, migration status, and integrity status.
- Diagnostic report contains no health values.
- Platform-provided aggregate crash diagnostics may be used; no invasive session replay or health-payload telemetry.

### 4.18 Update and release system

- Semantic app versioning.
- Independently version Prediction Engine, Reminder Engine, Backup Format, DB Schema, and Health Adapter.
- Development -> Wife Alpha -> Closed Beta -> Public Beta -> Production.
- CI includes static analysis, unit tests, prediction tests, migration tests, native adapter tests, integration tests, dependency scanning, and SBOM generation.

### 4.19 Supply-chain security

- Dependency pinning and lockfiles.
- Secret scanning and static analysis.
- Protected production branch when hosted.
- Signed releases.
- Least-privilege store credentials.
- No production signing materials committed to source control.

### 4.20 Prediction laboratory

- Synthetic regular and irregular datasets.
- Boundary datasets.
- Metrics: MAE, median absolute error, prediction-window coverage, early/late bias, over/under-confidence.
- Algorithm upgrades require evidence, not marketing language.

### 4.21 Reminder laboratory

Test at least reboot, DST forward/backward, time-zone change, app killed, offline operation, notification permission revoked/restored, app upgrade, clock changes, prediction edits, early/late starts, leap years, month/year boundaries.

### 4.22 Regulatory firewall

- Wellness/tracking copy is separated from medical claims.
- No disease diagnosis, treatment decision, or contraceptive-effectiveness claim in V1.
- Any future medical-device functionality requires a separate quality/regulatory programme.

## 5. Main screen map

1. Splash / local vault unlock
2. Welcome + privacy promise
3. Onboarding: mode, history, reminder, notification privacy, optional HealthKit
4. Home
5. Calendar
6. Log Today hub
7. Period editor
8. Symptoms
9. Reproductive observations
10. Medication/reminder manager
11. Insights
12. Prediction details
13. Life-stage mode
14. Health integrations
15. Doctor report builder
16. Partner share builder
17. Assistant
18. Backup/restore
19. Privacy Center
20. Reminder Health
21. Diagnostics
22. Settings / accessibility / localization

## 6. Domain invariants

- A period episode has start <= end when an end exists.
- Period episodes cannot silently overlap; overlap requires explicit merge/edit resolution.
- A completed cycle length is the day difference between consecutive period starts and must be positive.
- Predictions are not generated from malformed or impossible cycles.
- Prediction output always includes a likely date, a lower/upper window, algorithm version, and confidence.
- Deleting source observations triggers local recomputation.
- Every user-facing export is explicitly initiated by the user.
- A diagnostic export never serializes health-table rows.

## 7. Prediction v1 algorithm

Inputs: valid consecutive period-start dates, newest first, up to the most recent 12 complete cycle intervals.

1. Require two period starts for a point estimate; fewer produces an “insufficient history” state.
2. Compute cycle intervals.
3. Reject intervals outside 15–90 days from the estimator but retain records in history.
4. Calculate the median interval.
5. Apply recency weighting to intervals using weights 1..N from oldest to newest and compute a weighted mean.
6. Point estimate = rounded average of median and weighted mean.
7. Compute median absolute deviation (MAD).
8. Window half-width = clamp(round(max(2, 1.5 * MAD + dataPenalty)), 2, 10), where dataPenalty is 2 for fewer than 4 valid intervals, 1 for 4–5, otherwise 0.
9. Confidence: high for >=6 valid intervals and MAD <=2; medium for >=3 valid intervals and MAD <=5; otherwise low.
10. Prediction = latest start + estimated length.

The algorithm is intentionally interpretable and must be versioned `prediction-v1`.

## 8. Reminder state machine

States: disabled, permissionNeeded, scheduled, stale, blocked, error.

Events include preferenceChanged, predictionChanged, permissionChanged, timezoneChanged, appLaunched, appUpdated, periodStarted, periodEdited.

A scheduled reminder always stores its logical reminder ID, source prediction ID, target local date/time, privacy mode, and scheduler platform ID.

## 9. Encryption and key lifecycle

- Generate a random database key on first vault creation.
- Protect the key using the OS secure keystore/keychain.
- Never derive the database key solely from a short PIN.
- Biometric/PIN controls gate access to wrapped key material; implementation follows platform capabilities.
- CycleVault uses an independent random content-encryption key wrapped by a recovery key derived from a user passphrase using a memory-hard KDF supported by the chosen audited library.
- Backup passphrase is never stored in plaintext.

## 10. Privacy logging policy

Permitted application log fields: event category, non-sensitive error code, app version, schema version, component version, platform, generic state flags.

Forbidden: dates from health records, symptom names tied to a user event, free-text notes, medication names/doses, sexual activity, pregnancy/fertility observations, temperature values, HealthKit/Health Connect payload bodies.

## 11. Definition of worldwide v1.0

Worldwide v1.0 is complete only when every capability family in Section 4 is implemented for at least one supported platform and every applicable capability is implemented on the target platform, with unsupported platform-specific adapters disabled clearly rather than simulated.

The first distributable focus is iOS. Android shares domain/application code but receives its native adapter verification before Play production release.

## 12. Store and signing boundary

Source code and unsigned release artifacts can be produced without store credentials. Installation on an iPhone through TestFlight/App Store requires the owner's Apple Developer membership and signing/App Store Connect configuration. Signing secrets must never be committed to this repository.
