# Sreva Android Production Release Runbook

**Product:** Sreva  
**Package:** `com.sreva.health.sreva`  
**Release line:** `1.0.0+1`  
**Android minimum:** API 26  
**Google Play target:** API 36  
**Primary release artifact:** Android App Bundle (`.aab`)  
**Secondary installable artifact:** production-signed APK

> **C2 scope note (16 September 2026):** Android is one of three equal first-class Sreva clients alongside iOS and Web/PWA. The authoritative cross-platform architecture is `docs/superpowers/specs/2026-09-16-sreva-web-product-architecture-design.md`. This runbook remains authoritative for the Android release channel. The currently implemented `1.0.0+1` Android runtime is local-first and does not ship the future optional E2EE sync architecture merely because that architecture is approved.

This runbook is the authoritative operator procedure for producing and submitting the **current Android production release** without introducing a plaintext or developer-decryptable reproductive-health database.

## 1. Release boundary

Sreva's current Android production runtime keeps menstrual history, symptoms, notes, fertility observations, sexual-activity observations, prediction inputs and private reports local except for explicit user-directed/platform integration flows described by the applicable policy/declarations.

The release pipeline may process source code, build metadata, dependency manifests, SBOMs, signatures, checksums, and application binaries. Production signing secrets must never be committed to the repository.

The approved C2 architecture allows a **future optional E2EE continuity layer** in which health content is encrypted on an authorized client before upload and Sreva infrastructure stores ciphertext plus minimum operational metadata without possessing the vault-decryption key. That data flow is **not active in the current Android v1 runtime**. Before any Android build enables it, Section 16 of this runbook must be completed.

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
- Python reference and current mobile-closure tests;
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

As C2 implementation lands, shared-contract/Web/sync gates are additive. Do not remove a stronger Android gate merely because a new cross-platform gate exists.

A red applicable gate is a release blocker.

## 7. Build the real production artifacts

After `main` is green and the GitHub production secrets exist:

1. Open GitHub Actions.
2. Select **Sreva Android production release**.
3. Run the workflow from `main`.
4. The workflow repeats source, privacy, dependency and native tests.
5. It builds the Play-ready upload-key-signed AAB and production-signed APK.
6. It verifies both signatures.
7. It generates SHA-256 checksums.
8. It stores the signed release payload according to the repository's reviewed public-repository artifact-protection policy.

Expected plaintext files before controlled packaging/encryption:

```text
sreva-1.0.0+1-play.aab
sreva-1.0.0+1-production.apk
SHA256SUMS.txt
sreva-cyclonedx.json
pubspec.lock
```

## 8. Verify locally before Play upload

After decrypting/downloading the controlled production payload on a trusted machine, verify checksums and signatures again.

```bash
sha256sum -c SHA256SUMS.txt
jarsigner -verify -strict -certs sreva-1.0.0+1-play.aab
apksigner verify --verbose --print-certs sreva-1.0.0+1-production.apk
```

The signer certificate must match the intended upload/release key, not the Android debug certificate.

## 9. Play Console app-content declarations

Before any closed, open or production release, complete the required Play Console declarations.

Sreva must declare **Period Tracking** under the Health apps declaration because it tracks menstrual cycles and can support ovulation/fertility observations.

Health Connect access must be described accurately and must match permissions actually requested by the application.

The Play Store privacy-policy field must point to a public, non-geofenced, non-PDF URL. The same material policy must be available inside Sreva Privacy Center. Keep the public policy and in-app policy materially synchronized.

## 10. Data Safety position — current local-only Android release

The publisher must answer Play's Data Safety form from actual application behavior, not future architecture or marketing language.

The current Android v1 runtime is designed with:

- no Sreva-operated plaintext/developer-readable reproductive-health backend;
- no optional Sreva E2EE sync data flow enabled yet;
- no advertising SDK;
- no behavioral analytics SDK;
- no remote session replay;
- no developer health-payload telemetry;
- health records processed locally;
- exports/shares only after user action;
- Health Connect optional and permission-scoped.

User-initiated sharing, Health Connect, Play technical data and user-selected destinations are separate flows and must be described according to Google's form definitions for the exact release.

Never claim Google, Android, Health Connect or a chosen destination receives no metadata. For the current v1 runtime, the enforceable Sreva claim is that the operator does not receive readable reproductive-health content for core operation.

## 11. Store listing safety language

Store copy describes Sreva as menstrual-health tracking and wellness software. Do not describe v1 as a contraceptive method, pregnancy-prevention system, diagnostic medical device, disease detector, infertility treatment tool, or replacement for professional medical care.

Predictions are estimates with uncertainty, not guarantees.

## 12. First rollout sequence

```text
Internal testing
→ Closed testing
→ Wife validation
→ Wider closed beta
→ Production staged rollout
→ Worldwide availability
```

For every stage, verify period logging, prediction display, 3-day reminder, permission handling, backup/restore, data deletion, Health Connect authorization, app lock and notification privacy on a physical Android device.

## 13. Rollback and incident rule

If a released build has a privacy, corruption, migration, reminder, signing or security defect:

1. stop rollout immediately;
2. preserve failing build number and CI evidence;
3. identify whether local data integrity is affected;
4. prepare a higher `versionCode` repair;
5. run the full applicable verification suite;
6. resume only after repair verification.

Do not downgrade an installed Android database schema; forward repair is the supported recovery model.

## 14. Versioning rule

Every Play upload uses a strictly greater Android `versionCode`.

Current start:

```text
versionName = 1.0.0
versionCode = 1
```

## 15. Release evidence to preserve

For each production release preserve Git commit SHA, green CI run, production workflow run, AAB/APK SHA-256, SBOM, dependency scan result, package/version information, Play release identifier, staged-rollout decision, and migration/version matrix when relevant. No release evidence may contain real reproductive-health records or recovery/vault secrets.

## 16. Mandatory gate before any sync-enabled Android release

The approved C2 architecture is not permission to turn sync on silently. Before an Android binary that transmits encrypted health ciphertext to Sreva-operated infrastructure is submitted to any Play track:

1. the versioned E2EE key hierarchy and sync protocol must be reviewed and frozen;
2. Android ↔ iOS ↔ Web crypto/sync interoperability vectors must pass;
3. server authorization/replay/revoked-device/cross-account tests must pass;
4. account authentication must remain separate from vault decryption;
5. trusted-device and recovery-key loss/recovery cases must pass;
6. `PRIVACY.md`, the public/in-app privacy policy, and Android policy text must describe ciphertext sync and server-visible metadata accurately;
7. Play Data Safety and Health app declarations must be re-evaluated against the exact sync-enabled binary and dependencies;
8. user-facing Privacy Center must disclose sync state and the platform/server boundary truthfully;
9. no account may be required for core health functionality;
10. the 258-ID cross-platform traceability gate must show the applicable Android sync/identity requirements as implemented and verified.

If any item is incomplete, the Android release must remain local-only with sync disabled.
