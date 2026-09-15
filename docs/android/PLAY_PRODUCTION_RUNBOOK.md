# Sreva Android Production Release Runbook

**Product:** Sreva  
**Package:** `com.sreva.health.sreva`  
**Release line:** `1.0.0+1`  
**Android minimum:** API 26  
**Google Play target:** API 36  
**Primary release artifact:** Android App Bundle (`.aab`)  
**Secondary installable artifact:** production-signed APK  

This runbook is the authoritative operator procedure for producing and submitting an Android production release without introducing a developer-operated reproductive-health database.

## 1. Release boundary

Sreva's production infrastructure distributes software. It does not receive or maintain the user's menstrual history, symptoms, notes, fertility observations, sexual-activity observations, prediction inputs, or private reports.

The release pipeline may process source code, build metadata, dependency manifests, SBOMs, signatures, checksums, and application binaries. Production signing secrets must never be committed to the repository.

## 2. Required Google Play account actions

Before the first Play submission:

1. Complete Google Play developer identity verification.
2. Register the package name `com.sreva.health.sreva` under Android developer verification requirements.
3. Create the Sreva app entry in Play Console.
4. Enrol Sreva in Play App Signing.
5. Let Google manage the app-signing key unless there is a documented reason not to.
6. Create a separate developer-held upload key for signing App Bundles before upload.
7. Enable 2-Step Verification on the Google account and restrict Play Console access to least privilege.

For new Play apps, the upload key and Play app-signing key are separate security roles. The upload key signs the AAB you submit; Google Play signs the APKs delivered to users.

## 3. Required GitHub production secrets

Configure the `android-production` GitHub environment with all four signing values below:

- `SREVA_ANDROID_UPLOAD_KEYSTORE_B64` — base64-encoded Java upload keystore.
- `SREVA_ANDROID_KEYSTORE_PASSWORD` — keystore password.
- `SREVA_ANDROID_KEY_ALIAS` — upload-key alias.
- `SREVA_ANDROID_KEY_PASSWORD` — private-key password.

The workflow materializes the keystore only inside the ephemeral GitHub runner and deletes it when the runner is destroyed. The repository contains no signing key.

## 4. Generate the upload key once

Generate the upload key on a trusted machine and back it up securely. Example:

```bash
keytool -genkeypair \
  -keystore sreva-upload.jks \
  -alias sreva-upload \
  -keyalg RSA \
  -keysize 3072 \
  -validity 10000
```

Do not use the Android debug keystore. Do not reuse a personal SSH/GPG key. Store the keystore and recovery information in two secure locations under the publisher's control.

Encode it for the GitHub secret without printing it into chat or source control:

```bash
base64 -w 0 sreva-upload.jks
```

On macOS, use `base64 < sreva-upload.jks | tr -d '\n'`.

## 5. What the repository enforces automatically

`tool/configure_android_release.py` performs release hardening after Flutter generates the Android host:

- pins `compileSdk` to API 36;
- pins `targetSdk` to API 36;
- removes Flutter template debug signing from the release build;
- supports unsigned verification builds when production secrets are intentionally absent;
- fails closed if signing configuration is partial;
- requires all production signing inputs when `--require-signing` is used;
- refuses production release when the keystore path is missing.

`tool/configure_platforms.py` installs the native Sreva Android bridge, permissions, Health Connect rationale UI, privacy safeguards and reminder receivers.

`tool/configure_android_tests.py` installs the Kotlin native reminder regression tests.

## 6. Mandatory verification before a production build

The normal `Sreva CI` workflow must be green on `main` before production release. It covers:

- Dart formatting;
- Flutter static analysis;
- Flutter/unit/domain tests;
- Python reference and closure tests;
- privacy scan;
- OSV dependency vulnerability scan;
- CycloneDX SBOM generation;
- Android native host generation and validation;
- Android production-signing path validation with an ephemeral CI key;
- Kotlin release unit tests, including DST wall-clock reminder behavior;
- release AAB build;
- release APK build;
- AAB signature verification;
- APK signature verification;
- unsigned iOS compile verification as a secondary platform check.

A red gate is a release blocker.

## 7. Build the real production artifacts

After `main` is green and the GitHub production secrets exist:

1. Open GitHub Actions.
2. Select **Sreva Android production release**.
3. Run the workflow from `main`.
4. The workflow repeats source, privacy, dependency and native tests.
5. It builds the Play-ready upload-key-signed AAB and production-signed APK.
6. It verifies both signatures.
7. It generates SHA-256 checksums.
8. It uploads the release artifacts as one GitHub Actions artifact.

Expected files:

```text
sreva-1.0.0+1-play.aab
sreva-1.0.0+1-production.apk
SHA256SUMS.txt
sreva-cyclonedx.json
pubspec.lock
```

## 8. Verify locally before Play upload

After downloading the production artifact, verify the checksum file and signature again on a trusted machine.

Example checksum verification:

```bash
sha256sum -c SHA256SUMS.txt
```

Verify the AAB:

```bash
jarsigner -verify -strict -certs sreva-1.0.0+1-play.aab
```

Verify the APK with the newest installed Android build-tools `apksigner`:

```bash
apksigner verify --verbose --print-certs sreva-1.0.0+1-production.apk
```

The signer certificate must match the intended upload/release key, not the Android debug certificate.

## 9. Play Console app-content declarations

Before any closed, open or production release, complete the required Play Console declarations.

Sreva must declare **Period Tracking** under the Health apps declaration because it tracks menstrual cycles and can support ovulation/fertility observations.

Health Connect access must be described accurately and must match the permissions actually requested by the application. Sreva's Android manifest currently covers only the supported reproductive categories required by the implemented integration.

The Play Store privacy-policy field must point to a public, non-geofenced, non-PDF URL. The same policy is available inside the Sreva Privacy Center. The source text for the public page is maintained in this repository.

## 10. Data Safety position

The publisher must answer Play's Data Safety form from actual application behavior, not marketing language.

Sreva v1 is designed so reproductive-health data is processed locally and is not transmitted to a Sreva-operated health backend. There are no advertising, behavioral analytics, remote session replay, or developer health-payload telemetry SDKs in the v1 architecture.

User-initiated sharing through the Android Sharesheet, Health Connect integration, Play Store technical data and any destination selected by the user are separate flows and must be described according to Google's current form definitions at submission time.

Never claim that Google, Android, Health Connect or a user-selected share destination receives no metadata. The enforceable product claim is that Sreva's operator does not receive or maintain a reproductive-health database for core operation.

## 11. Store listing safety language

Store copy must describe Sreva as menstrual-health tracking and wellness software. Do not describe v1 as:

- a contraceptive method;
- a pregnancy-prevention system;
- a diagnostic medical device;
- a disease detector;
- an infertility treatment tool;
- a replacement for professional medical care.

Predictions must be described as estimates with uncertainty, not guarantees.

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

For every stage, verify period logging, prediction display, the 3-day reminder, permission handling, backup/restore, data deletion, Health Connect authorization, app lock and notification privacy on a physical Android device.

## 13. Rollback and incident rule

If a released build has a privacy, corruption, migration, reminder, signing or security defect:

1. stop rollout immediately;
2. preserve the failing build number and CI evidence;
3. identify whether local data integrity is affected;
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
- Play Console release identifier;
- staged rollout decision;
- migration/version matrix when schema changes.

No preserved evidence may contain real reproductive-health records.
