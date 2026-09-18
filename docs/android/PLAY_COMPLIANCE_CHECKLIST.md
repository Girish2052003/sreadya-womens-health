# Sreadya Google Play Compliance Checklist

> **C2 release-policy note — 17 September 2026:** This checklist preserves the complete Android/Google Play requirements while covering both local-only candidates and candidates that enable optional E2EE continuity. Android remains one of three equal first-class Sreadya clients. Account-free core health functionality remains first-class in either mode. A sync-enabled Android release must satisfy the additional C2 gate at the end of this file before any Play-track submission. Repository verification does not fabricate external Play Console evidence.

This file tracks store-facing requirements that sit outside normal unit tests. The repository must keep the implementation and this checklist consistent.

## Product classification

- Product category: menstrual health / period tracking / wellness.
- Google Play Health apps declaration: **Period Tracking**.
- Sreadya is not marketed as a contraceptive method or diagnostic medical device.
- Prediction text must remain probabilistic and uncertainty-aware.

## Package and platform requirements

- Android application ID: `com.sreadya.health.sreadya`.
- Minimum Android API: 26.
- Compile SDK: API 36.
- Target SDK: API 36.
- Package must be registered under current Android developer verification requirements before the applicable deadline.
- Play App Signing must be enabled before first public release.
- Developer-held upload key must be different from Android debug signing.

## Health Connect permissions in Sreadya

The Android host declares only the supported reproductive categories required by implemented features:

- menstruation read/write;
- intermenstrual bleeding read/write;
- basal body temperature read/write;
- cervical mucus read/write;
- ovulation test read/write;
- sexual activity read.

Permissions are requested at runtime only after explicit user action. Revocation must be tolerated without data corruption or app failure.

## Privacy-policy requirements

- Full privacy policy is available inside Sreadya Privacy Center and the in-app Privacy Policy screen.
- The public policy source is maintained in `docs/android/privacy-policy.html`.
- Before Play submission, publish that page at a publicly accessible, non-geofenced, non-PDF URL.
- Enter that exact URL in Play Console App content > Privacy policy.
- Keep the public policy and in-app policy materially synchronized.

The policy must explain, as applicable to the exact build:

- health data accessed/stored;
- purposes;
- account-free/local storage model;
- optional client-encrypted ciphertext continuity;
- server-visible minimum operational metadata and account/device state;
- trusted-device and recovery-key boundaries;
- Health Connect use;
- explicit sharing/export behavior;
- retention and deletion, including the limit that Sreadya cannot remotely erase former-device/export copies;
- backup behavior;
- security practices;
- diagnostics;
- publisher contact channel.

## Data Safety review

Before each store submission, compare the Play Data Safety questionnaire against the exact release binary and dependency lockfile.

Common Sreadya architecture properties:

- no advertising SDK;
- no behavioral analytics SDK;
- no remote session replay;
- no developer health-payload telemetry;
- user health intelligence remains client-side;
- exports/shares occur only after user action;
- Health Connect is optional and permission-scoped.

For a local-only build, reproductive-health history is processed locally and is not transmitted to Sreadya sync infrastructure. For a sync-enabled build, authorized clients encrypt health content before transmission and the service receives ciphertext plus minimum operational metadata; Sreadya infrastructure lacks the health-vault decryption key.

Do not mechanically answer "no data collected" without checking Google's current definitions for on-device processing, account/device metadata, Health Connect, user-initiated sharing, crash diagnostics, store telemetry, and any newly added dependency.

## Prominent disclosure

Before the first Health Connect permission request, Sreadya must explain:

- that access is optional;
- which categories are being requested;
- why the requested categories are useful;
- that core Sreadya data remains under the application's local privacy boundary;
- that access can be revoked in Android settings.

The native Health Connect rationale activity and onboarding/Health Integration screens implement this disclosure boundary.

## Health-data use restrictions

Sreadya health data must never be used for:

- advertising targeting;
- employment eligibility;
- insurance eligibility;
- unauthorized social sharing;
- sale of reproductive-health records;
- unrelated profiling.

Partner sharing remains explicit and user-controlled. Sensitive categories are not automatically included.

## Store listing review

Store listing text and screenshots must not imply certainty or medical approval that the product does not have.

Required concepts:

- private/local-first cycle companion;
- on-device cycle prediction;
- estimates, not guarantees;
- local reminders;
- optional Health Connect;
- user-controlled exports/backups;
- no operator-readable reproductive-health database for core operation or optional E2EE continuity;
- if sync is enabled, optional encrypted continuity with the health-vault decryption key unavailable to Sreadya infrastructure.

Avoid claims such as "medically accurate contraception", "guaranteed ovulation", "diagnoses PCOS", or equivalent wording.

## Release gates

A production upload is blocked unless all applicable items are true:

- `main` CI is green;
- OSV scan is green or every finding has a reviewed documented disposition;
- CycloneDX SBOM generated;
- privacy scan green;
- Flutter tests green;
- reference/closure tests green;
- Android Kotlin native tests green;
- production AAB successfully built with the upload key;
- AAB signature verification green;
- production APK signature verification green;
- release checksums generated;
- version code greater than every prior Play upload;
- Health apps declaration reviewed;
- Data Safety answers reviewed against the exact binary/dependencies;
- privacy policy URL live;
- package registration/identity verification complete;
- release notes reviewed;
- physical-device smoke test complete;
- for a sync-enabled candidate, the Task-26 release-policy contract and additional C2 gate below are green.

## Physical Android acceptance pass

Before production rollout, verify on at least one supported physical Android phone:

- fresh install;
- first-run privacy/onboarding;
- period start/end/edit/delete;
- flow and symptom logging;
- prediction window/confidence;
- default 3-day reminder;
- timezone change;
- reboot reminder reconstruction;
- notification permission revoke/restore;
- app lock and Sreadya PIN fallback;
- private notification modes;
- Health Connect permission request/read/write where available;
- CycleVault export and restore;
- report preview and share;
- individual observation deletion;
- full local wipe;
- offline operation;
- upgrade from the previous production build once one exists;
- when sync is enabled: account sign-in, trusted-device approval, encrypted sync, pause/disable sync, recovery-key restore and device revocation.

A physical-device failure blocks rollout even when CI is green.

## External account-state boundary

The following **external** actions cannot be proven by repository code alone and must be completed in the publisher's Google/Play account before production submission:

- developer identity verification;
- Play package-name registration;
- Play App Signing enrollment;
- production upload-key secret installation;
- privacy-policy public hosting;
- Health apps declaration submission;
- Data Safety submission;
- content rating/target-audience declarations;
- final Play review and rollout.

Repository formal closure means Sreadya is engineered and release-pipeline-ready for these account actions; it does not fabricate evidence that an external Play Console action has happened when it has not.

---

## Additional mandatory gate for a sync-enabled Android release

The implemented C2 continuity stack does **not** authorize Sreadya to turn sync on silently. Before any Android binary that sends encrypted health ciphertext to Sreadya-operated infrastructure enters any Play track:

- the reviewed versioned E2EE key hierarchy and sync protocol must be frozen;
- Android/Web/iOS interoperability vectors applicable to that release must pass;
- server authorization, replay, revoked-device, cross-account and ciphertext-limit tests must pass;
- account authentication must remain separate from health-vault decryption;
- trusted-device and recovery-key loss/recovery cases must pass;
- account-free core health functionality must remain available and disabling sync must leave local Sreadya usable;
- the public and in-app privacy policy must accurately disclose opaque account/device identifiers, server-visible minimum operational metadata, ciphertext sync, trusted devices, recovery-key limits, retention/deletion, the former-device/export deletion limitation, and the fact that Sreadya infrastructure lacks the vault-decryption key;
- Play Data Safety and Health app declarations must be re-evaluated against the **exact sync-enabled binary and dependency set**;
- SMS/email verification metadata must be reviewed if those channels are actually enabled;
- Privacy Center must show sync/device/server boundaries truthfully;
- applicable 258-ID C2 traceability and the Task-26 policy contract must pass.

Until all repository-controlled conditions are met, the Android release remains local-only with Sreadya sync disabled. If a required external Play Console action is incomplete, do not submit or roll out the affected release.
