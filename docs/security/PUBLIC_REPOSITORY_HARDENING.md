# Sreadya Public Repository Hardening State

**Status date:** 15 September 2026  
**C2 scope amendment:** 16 September 2026  
**Maintainer:** Girish Nallan Chakravathy  
**Canonical repository:** `Girish2052003/sreadya-womens-health`  
**Authoritative branch:** `main`

> **C2 preservation note:** The complete public-repository controls established on 15 September are preserved below. C2 extends their scope to future Web/PWA/shared-contract/sync-service work; it does not remove the operational details or weaken the native release boundary.

I maintain Sreadya as a public source repository while preserving the product's local-first privacy model. Making the source visible does not change Sreadya's health-data architecture: menstrual and reproductive-health data remains device-local unless the user explicitly chooses an operating-system health integration, export, or encrypted backup path.

This document records the repository-level controls that must remain intact so future maintenance does not accidentally weaken the release boundary.

> **C2 interpretation:** the statement above describes the currently implemented `1.1.0+2` mobile data flow. The approved future C2 architecture may add optional E2EE continuity in which authorized clients encrypt health content before upload and Sreadya infrastructure stores only ciphertext plus minimum operational metadata without the health-vault decryption key. That future flow is not active merely because it is documented.

## Hardened workflow boundary

The normal `Sreadya CI` workflow is verification-only for installable application binaries. It may compile, test, sign with disposable CI-only keys, and verify Android APK/AAB files, and it may compile the iOS application without production codesigning. It must not upload those installable CI builds as public Actions artifacts.

Normal CI may publish non-secret verification evidence such as the CycloneDX SBOM and `pubspec.lock`.

The Android production and family-preview workflows are separate controlled release paths. Family preview remains manually dispatched. Production may be manually dispatched or intentionally triggered by a change to the reviewed `release/android-production.json` manifest on canonical `main`. Both paths are guarded to the canonical repository and `refs/heads/main`, use environment-scoped secrets, disable persisted checkout credentials, and remove decoded keystores and plaintext release staging material in an `always()` cleanup step.

## Public artifact boundary

A public repository makes Actions metadata and artifacts more visible, so signed Android release files are not uploaded as plaintext Actions artifacts.

Before Actions-artifact upload, each controlled release workflow packages its APK/AAB, internal SHA-256 checksums, SBOM, and lockfile into a tar archive and encrypts that archive with AES-256-CBC using PBKDF2 and 200,000 iterations. Only the encrypted `.tar.gz.enc` payload is uploaded to **Actions artifact storage**.

For the production channel only, a separate publication job may download that encrypted payload, decrypt it using the environment-scoped artifact password, re-run the recorded SHA-256 checks, and publish the verified production APK as a public GitHub Release asset. That job publishes `sreadya-android.apk`, `sreadya-android.apk.sha256`, and the CycloneDX SBOM. It does **not** publish the Play AAB. The publication job receives a scoped `contents: write` token but does not receive the Android keystore or signing-key passwords.

The required encryption secrets are intentionally absent from Git:

- production environment: `SREADYA_PRODUCTION_ARTIFACT_PASSWORD`
- family-preview environment: `SREADYA_PREVIEW_ARTIFACT_PASSWORD`

The existing Android signing secrets also remain environment-scoped and must never be copied into issues, commits, logs, documentation, or chat transcripts.

To decrypt an authorized downloaded production payload locally, the maintainer can place the production artifact password in a local environment variable and run an equivalent command to:

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -in sreadya-1.1.0+2-production-release.tar.gz.enc \
  -out sreadya-1.1.0+2-production-release.tar.gz \
  -pass env:SREADYA_PRODUCTION_ARTIFACT_PASSWORD
```

Use the corresponding preview password variable for the family-preview payload. Password values are never documented here.

## Supply-chain controls

GitHub Actions dependencies in `.github/workflows/` are pinned to immutable 40-character commit SHAs. Human-readable major-version comments are retained only as documentation. A version upgrade must deliberately update the pinned SHA and pass the hardening regression tests.

Workflow token permissions are kept at `contents: read` by default. The production APK publication job is the reviewed exception: it receives `contents: write` only to create/update the public GitHub Release after the signed payload has already passed the production build job and encrypted-artifact boundary.

Public pull requests must never be given release-signing or artifact-encryption secrets. Production release publication can run only from canonical `main` through manual dispatch or a committed change to `release/android-production.json`; family preview remains `workflow_dispatch`-only and environment-scoped.

## Machine-enforced non-regression

`verification/reference/test_public_repository_hardening.py` checks the public-repository security boundary. Among other invariants, it verifies that:

- normal CI does not publish installable application artifacts;
- external Actions are commit-SHA pinned;
- controlled Android release workflows are canonical-repository/main-only;
- checkout credentials do not persist in those release workflows;
- decoded keystores are cleaned up even after failure;
- signed public Actions payloads are encrypted before upload; and
- this public security posture remains documented from both `README.md` and `SECURITY.md`.

The existing Sreadya verification suite remains authoritative for product behavior, distribution identity, privacy, release closure, and the worldwide-v1 capability contract. Repository hardening must not weaken or bypass those checks.

## Deliberate non-changes

This hardening does **not** change:

- Sreadya's Flutter product code in `lib/`;
- Android native capability templates in `platform_templates/android/`;
- iOS native capability templates in `platform_templates/ios/`;
- production package identity `com.sreadya.health.sreadya`;
- family-preview package identity `com.sreadya.health.sreadya.preview`;
- the local-sovereign health-data architecture;
- the repository dedication/provenance; or
- the v1 wellness/tracking boundary.

No software license is added by this security change. Public visibility alone should not be interpreted as a grant of rights beyond any license that may later be explicitly added to the repository.

## GitHub settings outside version-controlled files

Repository settings are not fully enforceable from source files. At the time this hardening pass began, GitHub reported `main` as unprotected and reported no repository rulesets. The maintainer should therefore keep the following settings as explicit repository-administration requirements:

1. Protect `main` or create an equivalent repository ruleset so pull requests and required Sreadya CI checks gate merges.
2. Keep the default Actions `GITHUB_TOKEN` permission read-only unless a workflow has a reviewed need for write access.
3. Do not allow fork-originated workflows to receive repository or environment secrets.
4. Enable GitHub secret scanning and push protection where the account/repository plan makes those controls available.
5. Keep the `android-production` and `android-family-preview` environments restricted to intentional release use, and add required-reviewer protection when practical.

## Maintenance rule

Before changing release workflows, signing configuration, repository visibility, artifact handling, or CI permissions, read this file together with `SECURITY.md`, `docs/verification/ANDROID_FORMAL_CLOSURE.md`, and `docs/android/DISTRIBUTION_IDENTITY_BOUNDARY.md`.

If a proposed change would expose signing material, publish plaintext signed binaries from routine public CI, publish the Play AAB publicly, weaken the canonical release guard, broaden workflow token privileges beyond the reviewed publication job without justification, or bypass the Sreadya verification gates, treat it as a release-blocking regression rather than a convenience change.

## C2 cross-platform hardening extension

When `web/`, `shared/`, or `sync_service/` is introduced under the approved C2 implementation programme, all controls above remain in force and the following are additive:

1. **Static Web/Pages secrets:** anything in the browser bundle is public. Pages/static-build jobs must never receive sync-service credentials, SMS/email provider secrets, vault/recovery secrets, administrator keys, or native signing secrets.
2. **Least-privilege Pages deployment:** static Pages deployment may use the minimum reviewed `pages: write` / `id-token: write` permissions only in the deployment job; unrelated jobs remain least-privilege.
3. **Pull-request isolation:** fork/PR jobs must not receive production backend, verification-provider, release, recovery, or artifact-encryption secrets.
4. **Backend environment separation:** future development/staging/production sync environments are separate. Real production reproductive-health records/ciphertext must not be copied into test/staging as convenient fixtures; tests use synthetic or explicitly created test accounts/data.
5. **Browser privacy gates:** CI expands to catch plaintext health data in URLs, caches, service-worker storage, logs, analytics, and browser fixtures; no session replay or health-payload telemetry is introduced.
6. **Web/backend supply chain:** npm/Go lock/dependency/SBOM/vulnerability/license/static-analysis gates are additive to current Flutter/mobile checks.
7. **Protocol review:** production sync/recovery cryptography is prohibited until the versioned E2EE key hierarchy/protocol, threat model, and cross-platform interoperability vectors pass the dedicated security gate.
8. **C2 traceability:** the historical 22-family verifier remains mobile-baseline evidence. Cross-platform completion requires the 258-ID registry with explicit implemented/verified/adapted/N/A evidence rather than silently treating mobile closure as Web/sync closure.
9. **No plaintext health backend:** compromise of a future sync database must not reveal readable menstrual/reproductive-health content by design; server schema/API must operate on opaque identifiers, versions, ciphertext, wrapped key material, and minimum operational metadata only.
10. **Recovery separation:** email/SMS account recovery and operational provider data must never create a hidden server-side path to decrypt an old health vault.

Before changing Web deployment, identity/sync infrastructure, recovery handling, or cross-platform cryptography, read this file together with `SECURITY.md`, `PRIVACY.md`, the C2 architecture constitution, the applicable release runbook, and the E2EE threat/protocol documents created by the implementation gate.

— **Girish Nallan Chakravathy**
