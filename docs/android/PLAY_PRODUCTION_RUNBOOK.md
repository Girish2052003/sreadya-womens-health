# Sreadya Android Production Release Runbook

> **C2 release-policy note — 17 September 2026:** This runbook preserves the full Android release procedure while supporting both local-only candidates and candidates that enable optional E2EE continuity. Android remains one of three equal first-class Sreadya clients. Account-free core health functionality stays complete. A sync-enabled Android release must satisfy the additional gate in Section 16 before any Play-track submission. External store/provider actions are never inferred from repository CI.

**Product:** Sreadya  
**Package:** `com.sreadya.health.sreadya`  
**Current release line:** `1.0.0+1`  
**Android minimum:** API 26  
**Google Play target:** API 36  
**Primary release artifact:** Android App Bundle (`.aab`)  
**Secondary installable artifact:** production-signed APK  

This runbook is the authoritative operator procedure for producing and submitting an Android production release while preserving Sreadya's no-readable-reproductive-health-backend promise.

## 1. Release boundary

Sreadya's local core works without an account or network. For a local-only build, production infrastructure distributes software and does not receive the user's menstrual history, symptoms, notes, fertility observations, sexual-activity observations, prediction inputs or private reports.

For a sync-enabled build, an authorized client encrypts health content before transmission. The reviewed continuity service receives ciphertext, wrapped key/recovery material and only the minimum operational metadata required for account/device authorization, synchronization, replay protection and revocation. Sreadya infrastructure does not possess the health-vault decryption key and must not receive readable reproductive-health payloads.

The release pipeline may process source code, build metadata, dependency manifests, SBOMs, signatures, checksums and application binaries. Production signing secrets must never be committed to the repository.

## 2. Required Google Play account actions

Before the first Play submission:

1. Complete Google Play developer identity verification.
2. Register the package name `com.sreadya.health.sreadya` under applicable Android developer verification requirements.
3. Create the Sreadya app entry in Play Console.
4. Enrol Sreadya in Play App Signing.
5. Let Google manage the app-signing key unless there is a documented reason not to.
6. Create a separate developer-held upload key for signing App Bundles before upload.
7. Enable 2-Step Verification on the Google account and restrict Play Console access to least privilege.

For new Play apps, the upload key and Play app-signing key are separate security roles. The upload key signs the AAB submitted by the publisher; Google Play signs APKs delivered to users.

These are **external** account/store actions. Repository CI cannot prove their completion.

## 3. Required GitHub production secrets

Configure the `android-production` GitHub environment with all four signing values below:

- `SREADYA_ANDROID_UPLOAD_KEYSTORE_B64` — base64-encoded Java upload keystore.
- `SREADYA_ANDROID_KEYSTORE_PASSWORD` — keystore password.
- `SREADYA_ANDROID_KEY_ALIAS` — upload-key alias.
- `SREADYA_ANDROID_KEY_PASSWORD` — private-key password.

The workflow materializes the keystore only inside the ephemeral GitHub runner and deletes it when the runner is destroyed. The repository contains no signing key.

## 4. Generate the upload key once

Generate the upload key on a trusted machine and back it up securely. Example:

```bash
keytool -genkeypair \
  -keystore sreadya-upload.jks \
  -alias sreadya-upload \
  -keyalg RSA \
  -keysize 3072 \
  -validity 10000
```

Do not use the Android debug keystore. Do not reuse a personal SSH/GPG key. Store the keystore and recovery information in two secure locations under the publisher's control.

Encode it for the GitHub secret without printing it into chat or source control:

```bash
base64 -w 0 sreadya-upload.jks
```

On macOS, use `base64 < sreadya-upload.jks | tr -d '\n'`.

## 5. What the repository enforces automatically

`tool/configure_android_release.py` performs release hardening after Flutter generates the Android host:

- pins `compileSdk` to API 36;
- pins `targetSdk` to API 36;
- removes Flutter template debug signing from the release build;
- supports unsigned verification builds when production secrets are intentionally absent;
- fails closed if signing configuration is partial;
- requires all production signing inputs when `--require-signing` is used;
- refuses production release when the keystore path is missing.

`tool/configure_platforms.py` installs the native Sreadya Android bridge, permissions, Health Connect rationale UI, privacy safeguards and reminder receivers.

`tool/configure_android_tests.py` installs the Kotlin native reminder regression tests.

## 6. Mandatory verification before a production build

The normal `Sreadya CI` workflow must be green on `main` before production release. It covers:

- Dart formatting;
- Flutter static analysis;
- Flutter/unit/domain tests;
- Python reference and closure tests;
- privacy scan;
- secret/credential scan;
- OSV dependency vulnerability scan;
- CycloneDX SBOM generation;
- shared-contract and C2 cross-platform traceability checks;
- Web core/security/browser verification;
- Android native host generation and validation;
- Android production-signing path validation with an ephemeral CI key;
- Kotlin release unit tests, including DST wall-clock reminder behavior;
- release AAB build;
- release APK build;
- AAB signature verification;
- APK signature verification;
- unsigned iOS compile verification as a secondary platform check.

For a sync-enabled candidate, C2 E2EE, sync-service, account/recovery, mobile-adapter and Task-26 policy gates are additive. A red gate is a release blocker.

## 7. Build the real production artifacts

After `main` is green and the GitHub production secrets exist:

1. Open GitHub Actions.
2. Select **Sreadya Android production release**.
3. Run the workflow from `main`.
4. The workflow repeats source, privacy, dependency and native tests.
5. It builds the Play-ready upload-key-signed AAB and production-signed APK.
6. It verifies both signatures.
7. It generates SHA-256 checksums.
8. It uploads the release artifacts under the repository's controlled artifact-protection boundary.

Expected plaintext payload after authorized decryption:

```text
sreadya-1.0.0+1-play.aab
sreadya-1.0.0+1-production.apk
SHA256SUMS.txt
sreadya-cyclonedx.json
pubspec.lock
```

Signed release payloads are encrypted before public Actions artifact storage; see `docs/security/PUBLIC_REPOSITORY_HARDENING.md`.

## 8. Verify locally before Play upload

After downloading and decrypting the production artifact on a trusted machine, verify checksums and signatures again.

```bash
sha256sum -c SHA256SUMS.txt
```

Verify the AAB:

```bash
jarsigner -verify -strict -certs sreadya-1.0.0+1-play.aab
```

Verify the APK with the newest installed Android build-tools `apksigner`:

```bash
apksigner verify --verbose --print-certs sreadya-1.0.0+1-production.apk
```

The signer certificate must match the intended upload/release key, not the Android debug certificate.

## 9. Play Console app-content declarations

Before any closed, open or production release, complete the required Play Console declarations for the exact candidate.

Sreadya must declare **Period Tracking** under the Health apps declaration because it tracks menstrual cycles and can support ovulation/fertility observations.

Health Connect access must be described accurately and must match the permissions actually requested by the application.

The Play Store privacy-policy field must point to a public, non-geofenced, non-PDF URL. The same material policy is available inside Sreadya. The source text for the public page is maintained in this repository.

## 10. Data Safety position

The publisher must answer Play's Data Safety form from actual application behavior, not marketing language.

For a local-only binary, reproductive-health data is processed locally and is not transmitted to Sreadya continuity infrastructure. There are no advertising, behavioral analytics, remote session replay or developer health-payload telemetry SDKs in the approved architecture.

For a sync-enabled binary, the accurate claim changes: authorized clients encrypt health content before transmission; Sreadya continuity infrastructure receives ciphertext plus minimum operational account/device/sync metadata and does not possess the health-vault decryption key.

User-initiated sharing through the Android Sharesheet, Health Connect integration, Play Store technical data, notification delivery and any destination selected by the user are separate flows and must be described according to the current form definitions at submission time.

Never claim that Google, Android, Health Connect or a user-selected share destination receives no metadata. The enforceable product claim is that Sreadya's operator does not receive readable reproductive-health content for core operation or optional E2EE continuity.

Re-evaluate Data Safety and the Health app declaration against the **exact release binary and dependency set** whenever shipping data flows or dependencies change.

## 11. Store listing safety language

Store copy must describe Sreadya as menstrual-health tracking and wellness software. Do not describe it as:

- a contraceptive method;
- a pregnancy-prevention system;
- a diagnostic medical device;
- a disease detector;
- an infertility treatment tool;
- a replacement for professional medical care.

Predictions must be described as estimates with uncertainty, not guarantees.

If sync is enabled, listing/privacy copy may describe optional E2EE continuity but must not imply that Sreadya can decrypt the health vault.

## 12. First rollout sequence

Use staged distribution rather than jumping directly to worldwide production:

```text
Internal testing
→ Closed testing
→ Wife validation
→ Wider closed beta
→ Production staged rollout
→ Worldwide availability
```

For every stage, verify period logging, prediction display, the 3-day reminder, permission handling, backup/restore, data deletion, Health Connect authorization, app lock and notification privacy on a physical Android device. For sync-enabled candidates also verify sign-in, trusted-device approval, encrypted sync, pause/disable sync, recovery-key restore and revoked-device behavior.

## 13. Rollback and incident rule

If a released build has a privacy, corruption, migration, reminder, signing, account/sync or security defect:

1. stop rollout immediately;
2. preserve the failing build number and CI evidence;
3. identify whether local or synchronized data integrity is affected;
4. prepare a higher `versionCode` repair release;
5. run the full verification suite;
6. resume rollout only after the repair is verified.

Do not attempt to downgrade an installed Android app's database schema. Forward repair is the supported production recovery model.

## 14. Versioning rule

Every Play upload must use a strictly greater Android `versionCode`. Semantic application versions are human-facing; the Android build number is monotonic.

For v1.0.0 the repository starts at:

```text
versionName = 1.0.0
versionCode = 1
```

Future releases must increment the build number even for a retry of the same semantic version.

## 15. Release evidence to preserve

For each production release preserve:

- Git commit SHA;
- green CI run URL/ID;
- production workflow run URL/ID;
- AAB SHA-256;
- APK SHA-256;
- SBOM;
- dependency-scan result;
- package/version information;
- Play Console release identifier after the external action actually occurs;
- staged rollout decision;
- migration/version matrix when schema changes;
- store/declaration review evidence for the exact release binary.

No preserved evidence may contain real reproductive-health records.

## 16. Mandatory C2 gate before any sync-enabled Android release

The implemented C2 continuity stack is not permission to turn sync on silently. Before any Android build that transmits encrypted health ciphertext to Sreadya-operated infrastructure is submitted to any Play track:

1. freeze and review the versioned E2EE key hierarchy and sync protocol;
2. pass applicable Android ↔ iOS ↔ Web crypto/sync interoperability vectors;
3. pass server authorization, replay, revoked-device, cross-account and ciphertext-limit tests;
4. prove account authentication alone cannot derive/decrypt the health-vault key;
5. pass trusted-device and recovery-key loss/recovery scenarios;
6. preserve full account-free core health functionality and prove disabling sync leaves local Sreadya usable;
7. update `PRIVACY.md`, public Web/Android policy, in-app privacy policy and Privacy Center to the actual sync behavior;
8. re-evaluate Play Data Safety and Health app declarations against the **exact sync-enabled binary and dependency set**;
9. review email/SMS verification metadata only if those channels are actually enabled;
10. disclose device/server/ciphertext/retention/deletion boundaries truthfully, including that Sreadya cannot remotely erase former-device copies or user-controlled exports/backups;
11. pass applicable 258-ID C2 cross-platform traceability and the Task-26 release-policy contract.

If any repository-controlled item is incomplete, keep the Android release local-only with Sreadya sync disabled. If a required external Play Console action is incomplete, do not submit or roll out the build. Repository closure never substitutes for external publisher/store evidence.
