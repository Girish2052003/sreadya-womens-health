# Sreva Master Product Specification v1.0

**Document role after C2 amendment:** Mobile Baseline Companion, revision 1.1  
**Original date:** 2026-09-15  
**C2 amendment date:** 2026-09-16  
**Public product name:** Sreva  
**In honour of:** Sreedevi Girish Nallan Chakravathy  
**Mobile platforms:** Android and iOS  
**Cross-platform product:** Android + iOS + Web/PWA  
**Architecture:** Local Sovereign Core + Optional End-to-End Encrypted Continuity

> **Compatibility note:** The legacy title `Sreva Master Product Specification v1.0` is intentionally retained because the existing mobile traceability verifier treats that exact title and Sections 4.1–4.22 as a frozen machine-readable anchor. C2 does not silently rewrite that verifier during documentation alignment.

> **Authority notice — 16 September 2026:** This file is the detailed Flutter/mobile baseline companion. The authoritative cross-platform constitution is `docs/superpowers/specs/2026-09-16-sreva-web-product-architecture-design.md`. If this file and that document differ, the 16 September C2 constitution wins. Android, iOS, and Web/PWA are equal first-class Sreva clients; this file must not be interpreted as making Web secondary.

## 1. Product promise

Sreva is a full women's cycle companion whose personal health intelligence remains with the woman. It must be useful for daily menstrual-cycle management while remaining understandable, private, reliable, accessible, and updateable like a production product.

Predicted period dates are estimates, never biological guarantees. Every prediction presents a likely date/window and confidence semantics defined by the shared Sreva contract.

The mobile Flutter client is one implementation of Sreva. The Web/PWA client uses Next.js/React/TypeScript and must conform to the same canonical health semantics through shared schemas, specifications, capability IDs, and conformance vectors.

## 2. Architectural laws

1. The local device/browser vault is the authoritative plaintext reproductive-health state.
2. Core functionality requires no account.
3. Core functionality requires no Internet connection.
4. Predictions execute locally.
5. Insights execute locally.
6. Reminder intent/policy is shared; mobile uses local OS scheduling and Web uses the strongest honest browser/PWA mechanism available.
7. The operator maintains no **plaintext or developer-decryptable** reproductive-health database. Optional account mode may synchronize ciphertext plus minimum operational metadata, and the operator must not possess the health-vault decryption key.
8. HealthKit / Health Connect integration is granular, explicit, optional, and platform-specific.
9. Sensitive health values never enter ordinary logs, analytics, diagnostics, URLs, or crash/session-replay payloads.
10. Mobile app updates are signed and distributed through platform release channels; Web/PWA updates use the reviewed Web release pipeline.
11. Every database/vault migration is transactional or equivalently fail-safe, validated, and preserves history.
12. V1 is menstrual-health tracking and wellness software, not diagnostic software and not a contraception-effectiveness product.
13. Account-free and account-based modes are equal in core health functionality; account mode adds E2EE continuity only.
14. Android, iOS, and Web/PWA must conform to the same canonical capability/behavior contract.

## 3. Production technology — mobile baseline

- Flutter 3.47.2 / Dart 3.13.2.
- Modular clean architecture with feature-oriented directories.
- Riverpod for state management.
- Declarative routing.
- SQLite with Drift for local persistence.
- SQLCipher-class encrypted database implementation, with random database key protected by Keychain / Android Keystore.
- Swift platform adapter for HealthKit, UserNotifications, LocalAuthentication, app-switcher privacy, and iOS APIs.
- Kotlin platform adapter for Health Connect, Android notification scheduling, biometrics, boot/time-zone rescheduling, and Android APIs.
- Local PDF and CSV report generation.
- Local cryptography for CycleVault backups using reviewed primitives.
- No cloud LLM required for core assistant functions.

Cross-platform additions are owned by the C2 constitution and implementation plan:

- `web/`: Next.js + React + TypeScript Web/PWA client.
- `shared/`: language-neutral capability registry, schemas, terminology, design tokens, prediction/reminder/crypto/sync vectors.
- `sync_service/`: optional provider-independent identity/E2EE sync service after protocol review.

## 4. Mobile capability baseline

The existing 22 sections remain the mobile implementation baseline. They map into the newer 18-family / 258-atomic-requirement C2 registry. Completion of a broad section here is not sufficient by itself to claim cross-platform C2 completion.

### 4.1 Home and onboarding

- No-account onboarding.
- Privacy-first explanation before permissions.
- Add historical periods manually.
- Optional import from platform health store.
- Select cycle/life-stage mode.
- Configure default 3-day reminder and notification privacy.
- Home summary: predicted date, likely window, confidence, quick log, period started, calendar.
- Future account onboarding must remain optional and must not gate the above health functionality.

### 4.2 Cycle and period tracking

- Start period today or another date.
- End period.
- Edit/delete historical entries.
- Flow: spotting/light/medium/heavy.
- Period-day timeline.
- Cycle length and period duration.
- Irregular-cycle support.
- Month/timeline/year views.

### 4.3 Prediction engine

- Next likely period date.
- Prediction window and confidence.
- Recent-cycle weighting.
- Robust outlier/incomplete-cycle handling.
- Period-duration estimate.
- Prediction history and algorithm version.
- Wider uncertainty for irregular cycles.
- Local evaluation metrics after outcomes.

### 4.4 Reminder engine

- Default 3-day reminder; optional 7-day, 1-day, expected-day, late reminders.
- Medication, supplement, contraception, ovulation-test, pregnancy-test reminders.
- User-selected time, quiet hours, snooze.
- Maximum/balanced/detailed privacy modes.
- Rebuild after prediction/time-zone/DST/update/permission/reboot events where platform permits.
- Reminder Health diagnostic screen.
- Shared reminder policy must remain equivalent to Web/PWA even when delivery adapters differ.

### 4.5 Daily health logging

Cramps, headache/migraine, back pain, breast tenderness, bloating, acne, nausea, digestion, fatigue, dizziness, appetite/cravings, sleep, energy, stress, mood, anxiety/irritability, libido, vaginal discharge, cervical mucus, basal body temperature, weight, exercise, water, custom symptoms, severity, notes.

### 4.6 Reproductive observations

Ovulation/pregnancy tests, basal temperature, cervical mucus, optional sexual activity/protection, contraception context, fertility observations, TTC mode, and no V1 contraceptive-effectiveness claim.

### 4.7 Life-stage modes

Cycle tracking, TTC, pregnancy, postpartum, breastfeeding, perimenopause, menopause transition, hormonal contraception. Mode change never deletes history.

### 4.8 Insights

Cycle/period averages, variation, shortest/longest cycle, flow patterns, symptom/PMS/mood/pain/sleep/energy trends, local observational correlations, explainable source/date range. Observation is not diagnosis.

### 4.9 Doctor / healthcare reports

User selects date range/categories; PDF/CSV generated locally; preview before share; sensitive categories excluded by default; no server report generation.

### 4.10 Ultra-easy interaction

Tap logging, local natural-language commands, ambiguity confirmation, and on-device voice recognition where available. Sensitive speech is not silently uploaded.

### 4.11 Partner sharing

User-controlled manual share/QR/export remains the baseline. Category controls exclude sensitive data by default. A future live `PartnerTransport` may reuse the reviewed E2EE continuity layer only after explicit opt-in and security review.

### 4.12 Platform health integration

- iOS: HealthKit read/write for supported reproductive types with granular authorization.
- Android: Health Connect read/write for supported types with granular authorization.
- Provenance/external IDs prevent duplicate import.
- Platform health stores are integrations, not Sreva's authoritative core vault.
- Web/PWA has no fake HealthKit/Health Connect adapter; synchronized records may still be viewed through authorized E2EE continuity once implemented.

### 4.13 Accessibility and worldwide readiness

Light/dark, dynamic text, VoiceOver/TalkBack semantics, high contrast/colour-safe status, one-handed interaction, localization, RTL, locale dates, 12/24-hour time, metric/imperial, offline operation, graceful poor network.

### 4.14 Privacy Center and app lock

Biometrics where available, PIN fallback architecture, automatic lock, app-switcher/sensitive-screen safeguards, notification privacy, data-purpose transparency, record deletion, full local wipe. Account and sync controls added by C2 must appear without weakening local-only/no-account privacy mode.

### 4.15 CycleVault backup and restore

Local encrypted archive, versioned manifest, authenticated encryption, user-chosen destination, temporary restore state, integrity/schema/domain validation, atomic replacement, failure leaves original data untouched. The current mobile format remains authoritative until cross-platform interoperability vectors prove a compatible Web implementation/evolution.

### 4.16 Database migrations

Versioned schema, local pre-migration recovery state, transactional migration, SQLite integrity/domain validation, rollback, adjacent and skipped-version upgrade tests.

### 4.17 Diagnostics and crash support

User-visible sanitized diagnostic report contains app/OS/schema/engine versions, permissions, scheduler state, migration/integrity status; never health values. Platform aggregate crash diagnostics may be used only under the no-health-payload rule.

### 4.18 Update and release system

Semantic app versioning; independently version Prediction Engine, Reminder Engine, Backup Format, DB Schema, Health Adapter. Current native path: Development → Wife Alpha → Closed Beta → Public Beta → Production. Cross-platform release closure additionally requires shared/Web conformance.

### 4.19 Supply-chain security

Dependency pinning/lockfiles, secret scanning/static analysis, signed releases, least-privilege credentials, no signing materials in source. C2 adds Web/backend dependency and SBOM scanning without removing mobile gates.

### 4.20 Prediction laboratory

Synthetic regular/irregular/boundary datasets; MAE, median absolute error, window coverage, early/late bias, over/under-confidence. Upgrades require evidence.

### 4.21 Reminder laboratory

Reboot, DST forward/back, timezone, app killed, offline, permission revoke/restore, update, clock changes, prediction edits, early/late starts, leap year, month/year boundaries. Web/PWA adds browser capability and Push/service-worker cases.

### 4.22 Regulatory firewall

Wellness/tracking copy stays separate from diagnosis, treatment, disease prediction, and contraception-effectiveness claims. Future medical-device functionality requires a separate quality/regulatory programme.

## 5. Mobile screen map and C2 relationship

Existing mobile screen map remains valid: vault unlock, welcome/privacy, onboarding, Home, Calendar, Log Today, Period editor, Symptoms/Reproductive observations, Medication/Reminders, Insights, Prediction details, Life stage, Health integrations, Reports, Partner sharing, Assistant, Backup/Restore, Privacy Center, Reminder Health, Diagnostics, Settings/accessibility/localization.

The Web/PWA route map is defined by the C2 constitution. Screen/route naming may differ by platform, but health meaning and capabilities must match.

## 6. Domain invariants

- Period start <= end when end exists.
- Episodes cannot silently overlap; explicit merge/edit resolution is required.
- Completed cycle length between consecutive period starts is positive.
- Malformed/impossible cycles do not feed predictions.
- Prediction output includes likely date, lower/upper window, algorithm version, confidence.
- Deleting source observations triggers local recomputation.
- User-facing export is user-initiated.
- Diagnostic export never serializes health-table rows.
- Same canonical input/engine version must produce contract-equivalent behavior in Dart and TypeScript implementations.

## 7. Prediction v1 algorithm

Inputs: valid consecutive period-start dates, newest first, up to the most recent 12 complete cycle intervals.

1. Require two period starts for a point estimate; fewer => insufficient history.
2. Compute cycle intervals.
3. Exclude intervals outside 15–90 days from estimator, while retaining history.
4. Calculate median interval.
5. Apply recency weights 1..N oldest→newest and compute weighted mean.
6. Point estimate = rounded average of median and weighted mean.
7. Compute median absolute deviation (MAD).
8. Window half-width = `clamp(round(max(2, 1.5 * MAD + dataPenalty)), 2, 10)`; dataPenalty = 2 for <4 valid intervals, 1 for 4–5, else 0.
9. Confidence: high for >=6 valid intervals and MAD <=2; medium for >=3 and MAD <=5; otherwise low.
10. Prediction = latest start + estimated length.

Version: `prediction-v1`. Shared JSON vectors will become the cross-platform authority for implementation equivalence.

## 8. Reminder state machine

States: `disabled`, `permissionNeeded`, `scheduled`, `stale`, `blocked`, `error`.

Events: `preferenceChanged`, `predictionChanged`, `permissionChanged`, `timezoneChanged`, `appLaunched`, `appUpdated`, `periodStarted`, `periodEdited`.

A scheduled reminder stores logical reminder ID, source prediction ID, target local date/time, privacy mode, and platform scheduler ID. Web maps the same logical plan to Web/PWA delivery capabilities without claiming native guarantees it does not have.

## 9. Encryption and key lifecycle

- Generate random mobile database key on first vault creation.
- Protect with OS secure keystore/keychain.
- Never derive database key solely from a short PIN.
- Biometrics/PIN gate wrapped key access according to platform capabilities.
- Existing CycleVault uses an independent random content-encryption key, AES-256-GCM, and Argon2id-based recovery derivation.
- Backup/recovery secret is never stored plaintext.
- C2 E2EE sync key hierarchy is a separate reviewed protocol; it must interoperate across Android/iOS/Web and must not be invented ad hoc inside UI code.

## 10. Privacy logging policy

Permitted: event category, non-sensitive error code, app/client version, schema/component version, platform, generic state flags.

Forbidden: health dates, user-linked symptom values, notes, medication names/doses, sexual activity, pregnancy/fertility observations, temperatures, HealthKit/Health Connect payload bodies, health search terms, decrypted sync payloads.

## 11. Definition of cross-platform worldwide completion

A broad mobile capability being implemented is not sufficient to claim global completion. Cross-platform completion follows the 258-ID C2 registry and Definition of Done in the authoritative C2 constitution.

The current distribution priority remains Android for native production release because the Android release pipeline is operational. iOS remains first-class and continuously no-codesign verified until publisher signing/App Store capability exists. Web/PWA is an equal first-class product client and provides a practical iPhone-access path independent of App Store distribution.

## 12. Store/signing/sync boundary

Source and unsigned/native verification artifacts can be produced without store credentials. Native iPhone App Store/TestFlight distribution requires Apple Developer signing/App Store Connect configuration; production Android uses controlled signing/Play release paths. Signing secrets never enter source control.

Optional account/E2EE sync is **not** silently enabled by this documentation change. Before a shipping binary begins transmitting encrypted user health ciphertext to Sreva-operated infrastructure, the release must pass the C2 sync/security protocol gates and the relevant public privacy policy/store declarations must be updated to match actual behavior.
