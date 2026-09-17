# Sreva Android Production Release Runbook

> **C2 release-policy note — 17 September 2026:** This runbook supports both local-only production candidates and candidates that enable optional E2EE continuity. Account-free core health functionality remains complete. A sync-enabled build must satisfy Section 16 before any Play-track submission, and external store/provider actions are never inferred from repository CI.

**Product:** Sreva  
**Package:** `com.sreva.health.sreva`  
**Current release line:** `1.0.0+1`  
**Android minimum:** API 26  
**Google Play target:** API 36  
**Primary release artifact:** Android App Bundle (`.aab`)  
**Secondary installable artifact:** production-signed APK  

## 1. Release boundary

Sreva's local core does not require an account or network. For local-only builds, Sreva infrastructure does not receive the user's reproductive-health history.

When a release explicitly enables optional E2EE continuity, an authorized client encrypts health content before transmission. The service handles ciphertext, wrapped key/recovery material and minimum operational metadata required for account/device authorization and synchronization. It must not possess the health-vault decryption key or receive readable menstrual history, symptoms, notes, fertility observations, sexual-activity observations, prediction payloads or private reports.

The release pipeline itself may process source code, build metadata, dependency manifests, SBOMs, signatures, checksums and application binaries. Production signing secrets must never be committed.

## 2. Required Google Play account actions

Before the first Play submission:

1. Complete Google Play developer identity verification.
2. Register package `com.sreva.health.sreva` under applicable Android developer-verification requirements.
3. Create the Sreva app entry in Play Console.
4. Enrol Sreva in Play App Signing.
5. Let Google manage the app-signing key unless a reviewed exception exists.
6. Create a separate developer-held upload key.
7. Enable strong account authentication and restrict Play Console access to least privilege.

These are external account/store actions; repository CI cannot prove completion.

## 3. Required GitHub production secrets

Configure the `android-production` GitHub environment with:

- `SREVA_ANDROID_UPLOAD_KEYSTORE_B64`
- `SREVA_ANDROID_KEYSTORE_PASSWORD`
- `SREVA_ANDROID_KEY_ALIAS`
- `SREVA_ANDROID_KEY_PASSWORD`

The workflow materializes the keystore only inside the ephemeral runner. No signing key belongs in the repository.

## 4. Generate the upload key once

Generate the upload key on a trusted machine and back it up securely, for example:

```bash
keytool -genkeypair \
  -keystore sreva-upload.jks \
  -alias sreva-upload \
  -keyalg RSA \
  -keysize 3072 \
  -validity 10000
```

Do not use the Android debug keystore or reuse personal SSH/GPG keys.

## 5. What the repository enforces automatically

`tool/configure_android_release.py` pins the Android API/release-signing boundary and fails closed on partial signing configuration. `tool/configure_platforms.py` installs the native Sreva Android bridge, permissions, Health Connect rationale UI and privacy safeguards. `tool/configure_android_tests.py` installs Kotlin native regression tests.

## 6. Mandatory verification before a production build

The normal `Sreva CI` workflow must be green on `main`. It covers formatting, Flutter analysis/tests, Python reference/closure tests, privacy/secret scans, dependency review, CycloneDX SBOM, shared/C2 traceability, Web/shared contracts, Android host/native tests and release artifacts, signature verification, and iOS no-codesign compilation.

C2 protocol, account/recovery, sync and policy gates are additive. A red gate is a release blocker.

## 7. Build the real production artifacts

After `main` is green and production secrets exist:

1. Open GitHub Actions.
2. Select **Sreva Android production release**.
3. Run from `main`.
4. The workflow repeats source, privacy, dependency and native tests.
5. It builds the upload-key-signed AAB and production-signed APK.
6. It verifies signatures and generates SHA-256 checksums.
7. Signed payloads remain subject to the repository's artifact-encryption boundary.

Expected plaintext release payload after authorized decryption includes the AAB, APK, checksums, SBOM and lockfile.

## 8. Verify locally before Play upload

On a trusted machine, verify checksums and signatures again. Example:

```bash
sha256sum -c SHA256SUMS.txt
jarsigner -verify -strict -certs sreva-1.0.0+1-play.aab
apksigner verify --verbose --print-certs sreva-1.0.0+1-production.apk
```

The signer must match the intended upload/release key, not Android debug signing.

## 9. Play Console app-content declarations

Before any internal/closed/open/production Play release, review the current Play Console requirements for the exact candidate. Sreva's health classification includes **Period Tracking** and Health Connect declarations must match actual requested permissions.

The Play privacy-policy field must point to a public, non-geofenced, non-PDF URL. The public and in-app policy must remain materially synchronized.

## 10. Data Safety position

Answer Data Safety from actual application behavior, not marketing language.

For a local-only binary, core reproductive-health records remain local except user-directed sharing/platform integrations. For a sync-enabled binary, the accurate statement is different: authorized clients send encrypted ciphertext plus minimum operational account/device/sync metadata to Sreva continuity infrastructure, which lacks the health-vault decryption key.

There are no advertising, behavioral analytics, remote session replay or developer health-payload telemetry SDKs in the approved architecture. User-selected sharing, Health Connect, Play technical data, notification delivery and other platform/provider flows must be assessed under their current definitions.

Re-evaluate Data Safety and the Health app declaration against the **exact release binary and dependency set** every time shipping data flows or dependencies change.

## 11. Store listing safety language

Describe Sreva as menstrual-health tracking and wellness software. Do not describe it as a contraceptive method, pregnancy-prevention system, diagnostic medical device, disease detector, infertility treatment tool, or replacement for professional care. Predictions are estimates with uncertainty, not guarantees.

If sync is enabled, listing/privacy copy may describe optional E2EE continuity but must not imply that Sreva can decrypt the health vault.

## 12. First rollout sequence

Use staged distribution:

```text
Internal testing
→ Closed testing
→ Wife validation
→ Wider closed beta
→ Production staged rollout
→ Worldwide availability
```

For each stage, test core health flows, reminders, permission handling, backup/restore, deletion, Health Connect, app lock, notification privacy and, when enabled, account/sync/recovery behavior on supported physical devices.

## 13. Rollback and incident rule

If a release has a privacy, corruption, migration, reminder, signing, account/sync or security defect: stop rollout; preserve evidence; determine data-integrity impact; prepare a higher-version repair; rerun the full suite; resume only after verification. Database downgrade is not a supported recovery method.

## 14. Versioning rule

Every Play upload uses a strictly greater Android `versionCode`. Semantic versions are human-facing; build numbers are monotonic.

## 15. Release evidence to preserve

For each production release preserve:

- Git commit SHA and green CI run ID/URL;
- production workflow run ID/URL;
- AAB/APK SHA-256 and signature evidence;
- SBOM and dependency-scan result;
- package/version information;
- store release identifier after the external action occurs;
- staged-rollout decision;
- migration/version matrix where relevant;
- store/declaration review record for the exact binary.

No evidence may contain real reproductive-health records.

## 16. Mandatory C2 gate before any sync-enabled Android release

Before an Android build that transmits encrypted health ciphertext to Sreva-operated infrastructure is submitted to any Play track:

1. freeze/review the versioned E2EE key hierarchy and sync protocol;
2. pass applicable Android ↔ iOS ↔ Web crypto/sync interoperability vectors;
3. pass server authorization, replay, revoked-device, cross-account and ciphertext-limit tests;
4. prove account authentication alone cannot derive/decrypt the health-vault key;
5. pass trusted-device and recovery-key loss/recovery scenarios;
6. preserve full account-free core health functionality and prove disabling sync leaves local Sreva usable;
7. align `PRIVACY.md`, public Web/Android policy, in-app privacy policy and Privacy Center with actual behavior;
8. re-evaluate Play Data Safety and Health app declarations against the **exact sync-enabled binary and dependency set**;
9. review email/SMS verification metadata only if those channels are actually enabled;
10. make device/server/ciphertext/retention/deletion boundaries truthful, including no remote-erasure claim for former devices or exports;
11. pass applicable 258-ID cross-platform traceability and Task-26 policy-contract tests.

If any repository-controlled item is incomplete, keep sync disabled in the Android release. If any required external Play Console action is incomplete, do not submit or roll out the build. Repository closure never substitutes for external publisher/store evidence.
