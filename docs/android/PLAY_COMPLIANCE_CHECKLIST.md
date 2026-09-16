# Sreva Google Play Compliance Checklist

This file tracks Android/Google Play store-facing requirements outside normal unit tests. It must remain consistent with the exact Android release binary.

> **C2 scope note (16 September 2026):** Android is one of three equal first-class Sreva clients alongside iOS and Web/PWA. The approved C2 architecture includes a future optional E2EE continuity mode, but the currently implemented `1.0.0+1` Android runtime remains local-first with no Sreva sync data flow enabled. Do not answer Play forms from future architecture; answer from the exact shipping binary.

## Product classification

- Product category: menstrual health / period tracking / wellness.
- Google Play Health apps declaration: **Period Tracking**.
- Sreva v1 is not marketed as a contraceptive method or diagnostic medical device.
- Prediction text remains probabilistic and uncertainty-aware.
- An account must not become a requirement for core health functionality under the approved C2 architecture.

## Package and platform requirements

- Android application ID: `com.sreva.health.sreva`.
- Minimum Android API: 26.
- Compile SDK: API 36.
- Target SDK: API 36.
- Package must be registered under applicable Android developer verification requirements.
- Play App Signing enabled before first public release.
- Developer-held upload key different from Android debug signing.

## Health Connect permissions in current Sreva v1

The Android host declares only supported reproductive categories required by implemented features:

- menstruation read/write;
- intermenstrual bleeding read/write;
- basal body temperature read/write;
- cervical mucus read/write;
- ovulation test read/write;
- sexual activity read.

Permissions are requested only after explicit user action. Revocation must be tolerated without corruption/failure.

## Privacy-policy requirements

- Full/material privacy policy available inside Sreva Privacy Center.
- Public policy source maintained in `docs/android/privacy-policy.html` until the cross-platform site becomes the public policy host.
- Before Play submission, publish at a public, non-geofenced, non-PDF URL.
- Enter the exact URL in Play Console.
- Keep public and in-app policies materially synchronized.

The policy explains health data accessed/stored, purposes, local storage, Health Connect, explicit sharing/export, retention/deletion, backup, security, diagnostics, and publisher contact.

When optional E2EE sync is actually implemented for a shipping Android release, the policy must additionally explain: account identifiers, server-visible metadata, ciphertext sync, trusted devices, recovery-key boundary, deletion/retention of server-side ciphertext/metadata, and the fact that Sreva infrastructure lacks the health-vault decryption key.

## Data Safety review — current release

Before each submission, compare the questionnaire against the exact release binary and dependency lockfile.

Expected current `1.0.0+1` Android behavior:

- no Sreva-operated plaintext/developer-readable reproductive-health backend;
- no Sreva E2EE sync data flow enabled yet;
- no advertising SDK;
- no behavioral analytics SDK;
- no remote session replay;
- no developer health-payload telemetry;
- user health records processed locally;
- exports/shares occur only after user action;
- Health Connect is optional and permission-scoped.

Do not mechanically answer “no data collected” without checking Google's definitions for on-device processing, Health Connect, user-initiated sharing, crash/store telemetry, or newly added dependencies.

### Additional gate for a future sync-enabled release

Before enabling account/E2EE continuity in any Play track:

- re-evaluate every Data Safety answer against the new network behavior;
- document account identifiers and operational metadata according to Google's applicable definitions;
- do not describe encrypted upload as “nothing leaves the device”;
- accurately state that health content is client-encrypted and Sreva cannot decrypt it;
- review retention/deletion/account-deletion behavior;
- review SMS/email verification metadata if those channels are enabled;
- ensure account-free core remains available.

## Prominent disclosure

Before the first Health Connect permission request, explain that access is optional, which categories are requested, why they are useful, that Sreva's local vault remains authoritative, and that access can be revoked in Android settings.

If optional sync is enabled later, its consent/setup is separate from Health Connect permission and must not be bundled as if one permission implies the other.

## Health-data use restrictions

Sreva health data must never be used for advertising targeting, employment/insurance eligibility, unauthorized social sharing, sale of reproductive-health records, or unrelated profiling.

Partner sharing is explicit and user-controlled. Sensitive categories are not automatically included.

## Store listing review

Store listing text/screenshots must not imply certainty or medical approval that the product does not have.

Required current concepts:

- private/local-first cycle companion;
- on-device cycle prediction;
- estimates, not guarantees;
- local/native reminders;
- optional Health Connect;
- user-controlled exports/backups;
- no developer-readable reproductive-health database.

Do not advertise future E2EE multi-device sync as available until it is present in the reviewed release. Once shipped, copy may describe optional E2EE continuity but must not claim the server sees literally no metadata.

Avoid claims such as “medically accurate contraception”, “guaranteed ovulation”, “diagnoses PCOS”, or equivalents.

## Release gates

A current production upload is blocked unless all applicable gates are green:

- `main` CI;
- OSV scan or reviewed disposition;
- CycloneDX SBOM;
- privacy scan;
- Flutter tests;
- reference/mobile-closure tests;
- Android Kotlin native tests;
- production AAB build and signature verification;
- production APK signature verification;
- release checksums;
- monotonically greater version code;
- Health apps declaration review;
- Data Safety review;
- live privacy-policy URL;
- package registration/identity verification;
- release notes;
- physical-device smoke test.

As C2 implementation lands, shared-contract/Web/cross-platform gates are additive. For a future sync-enabled Android release, the reviewed E2EE protocol, Android interoperability vectors, identity/recovery tests, server authorization tests, updated policies/declarations, and 258-ID applicable traceability are additional mandatory gates.

## Physical Android acceptance pass

Before current local-only production rollout, verify on a supported physical phone:

- fresh install and first-run privacy/onboarding;
- period start/end/edit/delete;
- flow/symptom logging;
- prediction window/confidence;
- default 3-day reminder;
- timezone change and reboot reminder reconstruction;
- notification permission revoke/restore;
- app lock/PIN fallback;
- private notification modes;
- Health Connect permission/read/write where available;
- CycleVault export/restore;
- report preview/share;
- individual observation deletion and full local wipe;
- offline operation;
- upgrade from previous production build once available.

When a sync-enabled release is proposed, add physical acceptance for optional account creation, account-free bypass, encrypted offline queue/reconnect, trusted-device enrollment, revoke device, recovery key, account identity recovery without vault-key recovery, pause/disable sync, and local health operation during sync-service outage.

A physical-device failure blocks rollout even if CI is green.

## External account-state boundary

The following cannot be proven by repository code alone and must be completed in publisher accounts as applicable: developer identity verification, package registration, Play App Signing, production upload-key secret installation, public policy hosting, Health apps declaration, Data Safety submission, content rating/target audience, and final Play review/rollout.

Future production account continuity also requires configured/approved email/SMS provider accounts if those recovery channels are enabled; repository architecture alone cannot fabricate evidence that those providers are configured or compliant.

Repository formal closure means Sreva is engineered and release-pipeline-ready for the applicable external account actions; it does not fabricate external-console evidence.
