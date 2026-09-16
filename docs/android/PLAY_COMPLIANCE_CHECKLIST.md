# Sreva Google Play Compliance Checklist

> **C2 scope note — 16 September 2026:** This checklist preserves the complete Android/Google Play requirements for the currently implemented local-first `1.0.0+1` release. Android is now one of three equal first-class Sreva clients. The approved future E2EE continuity architecture does not change the declarations for a binary that does not ship that data flow. A sync-enabled Android release must satisfy the additional C2 gate at the end of this file before any Play-track submission.

This file tracks store-facing requirements that sit outside normal unit tests. The repository must keep the implementation and this checklist consistent.

## Product classification

- Product category: menstrual health / period tracking / wellness.
- Google Play Health apps declaration: **Period Tracking**.
- Sreva v1 is not marketed as a contraceptive method or diagnostic medical device.
- Prediction text must remain probabilistic and uncertainty-aware.

## Package and platform requirements

- Android application ID: `com.sreva.health.sreva`.
- Minimum Android API: 26.
- Compile SDK: API 36.
- Target SDK: API 36.
- Package must be registered under current Android developer verification requirements before the applicable deadline.
- Play App Signing must be enabled before first public release.
- Developer-held upload key must be different from Android debug signing.

## Health Connect permissions in Sreva v1

The Android host declares only the supported reproductive categories required by implemented features:

- menstruation read/write;
- intermenstrual bleeding read/write;
- basal body temperature read/write;
- cervical mucus read/write;
- ovulation test read/write;
- sexual activity read.

Permissions are requested at runtime only after explicit user action. Revocation must be tolerated without data corruption or app failure.

## Privacy-policy requirements

- Full privacy policy is available inside Sreva Privacy Center.
- The public policy source is maintained in `docs/android/privacy-policy.html`.
- Before Play submission, publish that page at a publicly accessible, non-geofenced, non-PDF URL.
- Enter that exact URL in Play Console App content > Privacy policy.
- Keep the public policy and in-app policy materially synchronized.

The policy must explain:

- health data accessed/stored;
- purposes;
- local storage model;
- Health Connect use;
- explicit sharing/export behavior;
- retention and deletion;
- backup behavior;
- security practices;
- diagnostics;
- publisher contact channel.

## Data Safety review

Before each store submission, compare the Play Data Safety questionnaire against the exact release binary and dependency lockfile.

Expected Sreva v1 architecture:

- no developer reproductive-health backend;
- no advertising SDK;
- no behavioral analytics SDK;
- no remote session replay;
- no developer health-payload telemetry;
- user health records processed locally;
- exports/shares occur only after user action;
- Health Connect is optional and permission-scoped.

Do not mechanically answer "no data collected" without checking Google's current definitions for on-device processing, Health Connect, user-initiated sharing, crash diagnostics, store telemetry and any newly added dependency.

## Prominent disclosure

Before the first Health Connect permission request, Sreva must explain:

- that access is optional;
- which categories are being requested;
- why the requested categories are useful;
- that core Sreva data remains local;
- that access can be revoked in Android settings.

The native Health Connect rationale activity and onboarding/Health Integration screens implement this disclosure boundary.

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

Required concepts:

- private/local-first cycle companion;
- on-device cycle prediction;
- estimates, not guarantees;
- local reminders;
- optional Health Connect;
- user-controlled exports/backups;
- no developer reproductive-health database for core operation.

Avoid claims such as "medically accurate contraception", "guaranteed ovulation", "diagnoses PCOS", or equivalent wording.

## Release gates

A production upload is blocked unless all of these are true:

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
- Data Safety answers reviewed;
- privacy policy URL live;
- package registration/identity verification complete;
- release notes reviewed;
- physical-device smoke test complete.

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
- app lock and Sreva PIN fallback;
- private notification modes;
- Health Connect permission request/read/write where available;
- CycleVault export and restore;
- report preview and share;
- individual observation deletion;
- full local wipe;
- offline operation;
- upgrade from the previous production build once one exists.

A physical-device failure blocks rollout even when CI is green.

## External account-state boundary

The following actions cannot be proven by repository code alone and must be completed in the publisher's Google/Play account before production submission:

- developer identity verification;
- Play package-name registration;
- Play App Signing enrollment;
- production upload-key secret installation;
- privacy-policy public hosting;
- Health apps declaration submission;
- Data Safety submission;
- content rating/target-audience declarations;
- final Play review and rollout.

Repository formal closure means Sreva is engineered and release-pipeline-ready for these account actions; it does not fabricate evidence that an external Play Console action has happened when it has not.

---

## Additional mandatory gate for a future sync-enabled Android release

The approved C2 architecture does **not** authorize Sreva to turn sync on silently. Before any Android binary that sends encrypted health ciphertext to Sreva-operated infrastructure enters any Play track:

- the reviewed versioned E2EE key hierarchy and sync protocol must be frozen;
- Android/Web/iOS interoperability vectors applicable to that release must pass;
- server authorization, replay, revoked-device, and cross-account tests must pass;
- account authentication must remain separate from health-vault decryption;
- trusted-device and recovery-key loss/recovery cases must pass;
- account-free core health functionality must remain available;
- the privacy policy must accurately disclose account identifiers, server-visible minimum metadata, ciphertext sync, trusted devices, recovery-key limits, retention/deletion, and the fact that Sreva infrastructure lacks the vault-decryption key;
- Play Data Safety and Health app declarations must be re-evaluated against the **exact** sync-enabled binary and dependency set;
- SMS/email verification metadata must be reviewed if those channels are enabled;
- Privacy Center must show sync/device/server boundaries truthfully;
- applicable 258-ID C2 traceability must be implemented and verified.

Until all of those conditions are met, the Android release remains local-only with Sreva sync disabled.
