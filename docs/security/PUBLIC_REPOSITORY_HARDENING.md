# Sreva Public Repository Hardening State

**Status date:** 15 September 2026  
**Maintainer:** Girish Nallan Chakravathy  
**Canonical repository:** `Girish2052003/sreva-womens-health`  
**Authoritative branch:** `main`

I maintain Sreva as a public source repository while preserving the product's local-first privacy model. Making the source visible does not change Sreva's health-data architecture: menstrual and reproductive-health data remains device-local unless the user explicitly chooses an operating-system health integration, export, or encrypted backup path.

This document records the repository-level controls that must remain intact so future maintenance does not accidentally weaken the release boundary.

## Hardened workflow boundary

The normal `Sreva CI` workflow is verification-only for installable application binaries. It may compile, test, sign with disposable CI-only keys, and verify Android APK/AAB files, and it may compile the iOS application without production codesigning. It must not upload those installable CI builds as public Actions artifacts.

Normal CI may publish non-secret verification evidence such as the CycloneDX SBOM and `pubspec.lock`.

The Android production and family-preview workflows are separate, manually dispatched release paths. They are guarded so release jobs run only in the canonical repository on `refs/heads/main`. Both release paths use environment-scoped secrets, disable persisted checkout credentials, and remove decoded keystores and plaintext release staging material in an `always()` cleanup step.

## Public artifact boundary

A public repository makes Actions metadata and artifacts more visible, so signed Android release files are not uploaded as plaintext Actions artifacts.

Before upload, each controlled release workflow packages its APK/AAB, internal SHA-256 checksums, SBOM, and lockfile into a tar archive and encrypts that archive with AES-256-CBC using PBKDF2 and 200,000 iterations. Only the encrypted `.tar.gz.enc` payload is uploaded.

The required encryption secrets are intentionally absent from Git:

- production environment: `SREVA_PRODUCTION_ARTIFACT_PASSWORD`
- family-preview environment: `SREVA_PREVIEW_ARTIFACT_PASSWORD`

The existing Android signing secrets also remain environment-scoped and must never be copied into issues, commits, logs, documentation, or chat transcripts.

To decrypt an authorized downloaded production payload locally, the maintainer can place the production artifact password in a local environment variable and run an equivalent command to:

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -in sreva-1.0.0+1-production-release.tar.gz.enc \
  -out sreva-1.0.0+1-production-release.tar.gz \
  -pass env:SREVA_PRODUCTION_ARTIFACT_PASSWORD
```

Use the corresponding preview password variable for the family-preview payload. Password values are never documented here.

## Supply-chain controls

GitHub Actions dependencies in `.github/workflows/` are pinned to immutable 40-character commit SHAs. Human-readable major-version comments are retained only as documentation. A version upgrade must deliberately update the pinned SHA and pass the hardening regression tests.

Workflow token permissions are kept at `contents: read`. A future workflow must not request broader permissions unless that permission is necessary, separately reviewed, and documented.

Public pull requests must never be given release-signing or artifact-encryption secrets. Release workflows remain `workflow_dispatch`-only and environment-scoped.

## Machine-enforced non-regression

`verification/reference/test_public_repository_hardening.py` checks the public-repository security boundary. Among other invariants, it verifies that:

- normal CI does not publish installable application artifacts;
- external Actions are commit-SHA pinned;
- controlled Android release workflows are canonical-repository/main-only;
- checkout credentials do not persist in those release workflows;
- decoded keystores are cleaned up even after failure;
- signed public Actions payloads are encrypted before upload; and
- this public security posture remains documented from both `README.md` and `SECURITY.md`.

The existing Sreva verification suite remains authoritative for product behavior, distribution identity, privacy, release closure, and the worldwide-v1 capability contract. Repository hardening must not weaken or bypass those checks.

## Deliberate non-changes

This hardening does **not** change:

- Sreva's Flutter product code in `lib/`;
- Android native capability templates in `platform_templates/android/`;
- iOS native capability templates in `platform_templates/ios/`;
- production package identity `com.sreva.health.sreva`;
- family-preview package identity `com.sreva.health.sreva.preview`;
- the local-sovereign health-data architecture;
- the repository dedication/provenance; or
- the v1 wellness/tracking boundary.

No software license is added by this security change. Public visibility alone should not be interpreted as a grant of rights beyond any license that may later be explicitly added to the repository.

## GitHub settings outside version-controlled files

Repository settings are not fully enforceable from source files. At the time this hardening pass began, GitHub reported `main` as unprotected and reported no repository rulesets. The maintainer should therefore keep the following settings as explicit repository-administration requirements:

1. Protect `main` or create an equivalent repository ruleset so pull requests and required Sreva CI checks gate merges.
2. Keep the default Actions `GITHUB_TOKEN` permission read-only unless a workflow has a reviewed need for write access.
3. Do not allow fork-originated workflows to receive repository or environment secrets.
4. Enable GitHub secret scanning and push protection where the account/repository plan makes those controls available.
5. Keep the `android-production` and `android-family-preview` environments restricted to intentional release use, and add required-reviewer protection when practical.

## Maintenance rule

Before changing release workflows, signing configuration, repository visibility, artifact handling, or CI permissions, read this file together with `SECURITY.md`, `docs/verification/ANDROID_FORMAL_CLOSURE.md`, and `docs/android/DISTRIBUTION_IDENTITY_BOUNDARY.md`.

If a proposed change would expose signing material, publish plaintext signed binaries from routine public CI, weaken the canonical release guard, broaden workflow token privileges without justification, or bypass the Sreva verification gates, treat it as a release-blocking regression rather than a convenience change.

— **Girish Nallan Chakravathy**
