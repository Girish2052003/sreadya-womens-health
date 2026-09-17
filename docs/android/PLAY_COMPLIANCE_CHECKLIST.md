# Sreva Google Play Compliance Checklist

> **C2 release-policy note — 17 September 2026:** This checklist covers both local-only Android candidates and candidates that enable optional E2EE continuity. Account-free core health functionality remains first-class in either case. A sync-enabled candidate must pass the additional gate below before any Play-track submission; repository verification does not fabricate external Play Console evidence.

This file tracks store-facing requirements that sit outside normal unit tests. The repository must keep the implementation, public/in-app privacy wording and this checklist consistent.

## Product classification

- Product category: menstrual health / period tracking / wellness.
- Google Play Health apps declaration: **Period Tracking**.
- Sreva is not marketed as a contraceptive method or diagnostic medical device.
- Prediction text must remain probabilistic and uncertainty-aware.

## Package and platform requirements

- Android application ID: `com.sreva.health.sreva`.
- Minimum Android API: 26.
- Compile SDK: API 36.
- Target SDK: API 36.
- Package must be registered under applicable Android developer-verification requirements before release.
- Play App Signing must be enabled before first public release.
- Developer-held upload key must be different from Android debug signing.

## Health Connect permissions

The Android host declares only the supported reproductive categories required by implemented features:

- menstruation read/write;
- intermenstrual bleeding read/write;
- basal body temperature read/write;
- cervical mucus read/write;
- ovulation test read/write;
- sexual activity read.

Permissions are requested at runtime only after explicit user action. Revocation must be tolerated without data corruption or app failure.

## Privacy-policy requirements

- Full privacy policy is available inside Sreva Privacy Center / in-app policy UI.
- The public Android policy source is maintained in `docs/android/privacy-policy.html`.
- Before Play submission, publish that page at a publicly accessible, non-geofenced, non-PDF URL.
- Enter that exact URL in Play Console App content > Privacy policy.
- Keep the public policy and in-app policy materially synchronized.

The policy must explain, as applicable to the exact build:

- health data accessed/stored and its purposes;
- local/account-free storage model;
- optional client-encrypted ciphertext continuity;
- server-visible minimum operational metadata and account/device state;
- trusted-device and recovery-key boundaries;
- Health Connect use;
- explicit sharing/export behavior;
- retention and deletion, including limits on former-device/export erasure;
- backup behavior;
- security practices;
- diagnostics;
- publisher contact channel.

## Data Safety review

Before each store submission, compare the Play Data Safety questionnaire against the **exact release binary and dependency lockfiles**.

Common Sreva privacy properties:

- no advertising SDK;
- no behavioral analytics SDK;
- no remote session replay;
- no developer health-payload telemetry;
- user health intelligence remains client-side;
- exports/shares occur only after user action;
- Health Connect is optional and permission-scoped.

For a local-only build, health history is not sent to Sreva sync infrastructure. For a sync-enabled build, authorized clients encrypt health content before transmission and the service receives ciphertext plus minimum operational metadata; Sreva infrastructure lacks the health-vault decryption key.

Do not mechanically answer "no data collected" without checking Google's current definitions for on-device processing, account/device metadata, Health Connect, user-initiated sharing, crash diagnostics, store telemetry, and any newly added dependency.

## Prominent disclosure

Before the first Health Connect permission request, Sreva must explain:

- that access is optional;
- which categories are being requested;
- why the requested categories are useful;
- that core Sreva data remains under the application's local privacy boundary;
- that access can be revoked in Android settings.

## Health-data use restrictions

Sreva health data must never be used for:

- advertising targeting;
- employment eligibility;
- insurance eligibility;
- unauthorized social sharing;
- sale of reproductive-health records;
- unrelated profiling.

Partner sharing remains explicit and user-controlled. Sensitive categories are not automatically included.

## Store listing review

Store listing text and screenshots must not imply certainty or medical approval that the product does not have.

Required concepts must match the exact released mode: private/local-first core; estimates, not guarantees; optional Health Connect; user-controlled exports/backups; and, if enabled, optional E2EE continuity without operator-readable health content.

Avoid claims such as "medically accurate contraception", "guaranteed ovulation", "diagnoses PCOS", or equivalent wording.

## Repository-controlled release gates

A production upload is blocked unless applicable repository-controlled gates are green, including:

- `main` CI;
- OSV/dependency review;
- CycloneDX SBOM generation;
- privacy and credential scans;
- Flutter tests and reference/closure tests;
- Android Kotlin native tests;
- release AAB/APK build and signature verification;
- release checksums;
- version-code monotonicity;
- release notes review;
- physical-device acceptance when required.

## Physical Android acceptance pass

Before production rollout, verify on at least one supported physical Android phone: fresh install; onboarding/privacy; period editing; logging; prediction/confidence; reminders/timezone/reboot; permission changes; app lock; private notifications; Health Connect where available; CycleVault export/restore; report share; observation deletion; full local wipe; offline operation; and upgrade from a previous production build once one exists.

A physical-device failure blocks rollout even when CI is green.

## External account/store-state boundary

The following are **external** actions and cannot be proven by repository code alone:

- Google Play developer identity verification;
- Play package-name registration;
- Play App Signing enrollment;
- production upload-key secret installation;
- privacy-policy public hosting;
- Health apps declaration submission;
- Data Safety submission;
- content rating/target-audience declarations;
- final Play review and rollout.

Repository formal closure means Sreva is engineered and release-pipeline-ready for these actions; it does not claim they happened when they have not.

---

## Mandatory gate for a sync-enabled Android release candidate

The C2 continuity implementation does not authorize a shipping binary to turn sync on silently. Before any Android binary that sends encrypted health ciphertext to Sreva-operated infrastructure enters any Play track:

- freeze and review the versioned E2EE key hierarchy and sync protocol;
- pass applicable Android ↔ iOS ↔ Web interoperability vectors;
- pass server authorization, replay, revoked-device, cross-account and ciphertext-limit tests;
- prove account authentication alone cannot derive/decrypt the health-vault key;
- pass trusted-device and recovery-key loss/recovery cases;
- preserve full account-free core health functionality and local use after disabling sync;
- ensure public and in-app privacy policy text accurately discloses opaque account/device identifiers, server-visible minimum operational metadata, ciphertext sync, trusted devices, recovery-key limits, retention/deletion, and the fact that Sreva infrastructure lacks the health-vault decryption key;
- re-evaluate Play Data Safety and Health app declarations against the **exact sync-enabled binary and dependency set**;
- review email/SMS verification metadata if those channels are actually enabled;
- make Privacy Center show sync/device/server boundaries truthfully;
- pass applicable 258-ID C2 traceability and Task-26 policy-contract checks.

If any repository-controlled item is incomplete, keep the Android release local-only with Sreva sync disabled. If an external Play Console item is incomplete, do not submit or roll out the affected release.
