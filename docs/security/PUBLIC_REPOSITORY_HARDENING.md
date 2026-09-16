# Sreva Public Repository Hardening State

**Status date:** 15 September 2026; C2 scope amendment 16 September 2026  
**Maintainer:** Girish Nallan Chakravathy  
**Canonical repository:** `Girish2052003/sreva-womens-health`  
**Authoritative branch:** `main`

I maintain Sreva as a public source repository while preserving the product's local-first privacy model. Public source visibility does not give the operator access to reproductive-health data.

For the **currently implemented `1.0.0+1` mobile baseline**, menstrual and reproductive-health data remains device-local except when the user explicitly chooses an operating-system health integration, export, or encrypted backup path.

The approved C2 architecture now also permits a **future optional E2EE continuity layer** across Android, iOS and Web/PWA. That future service may receive ciphertext plus minimum operational metadata but must not receive readable health content or possess the health-vault decryption key. This public-repository hardening document does not claim that sync is already implemented or shipping.

This file records repository-level controls that must remain intact so maintenance does not accidentally weaken either the current release boundary or future C2 security requirements.

## Cross-platform authority boundary

The authoritative product architecture is `docs/superpowers/specs/2026-09-16-sreva-web-product-architecture-design.md`. Android, iOS and Web/PWA are equal first-class clients. Repository hardening must protect all of them without weakening the existing native gates.

The existing Flutter/mobile code and release pipelines remain the current implemented baseline. Web/PWA/shared-contract/sync-service code is introduced only through the approved C2 implementation plan.

## Hardened workflow boundary

The normal `Sreva CI` workflow is currently verification-only for installable native application binaries. It may compile, test, sign with disposable CI-only keys, and verify Android APK/AAB files, and it may compile the iOS application without production codesigning. It must not upload those ordinary installable CI builds as public Actions artifacts.

Normal CI may publish non-secret verification evidence such as the CycloneDX SBOM and `pubspec.lock`.

The Android production and family-preview workflows are separate, manually dispatched release paths. They are guarded so release jobs run only in the canonical repository on `refs/heads/main`. Both release paths use environment-scoped secrets, disable persisted checkout credentials, and remove decoded keystores and plaintext release staging material in an `always()` cleanup step.

Future Web/Pages workflows must use only the minimum permissions needed for static deployment. Static browser bundles must never receive sync-service credentials, SMS/email provider secrets, recovery keys, vault secrets, signing secrets, or administrator credentials.

## Public artifact boundary

A public repository makes Actions metadata and artifacts more visible, so signed Android release files are not uploaded as plaintext Actions artifacts.

Before upload, each controlled Android release workflow packages its APK/AAB, internal SHA-256 checksums, SBOM, and lockfile into a tar archive and encrypts that archive with AES-256-CBC using PBKDF2 and 200,000 iterations. Only the encrypted `.tar.gz.enc` payload is uploaded.

Required encryption secrets are intentionally absent from Git:

- production environment: `SREVA_PRODUCTION_ARTIFACT_PASSWORD`
- family-preview environment: `SREVA_PREVIEW_ARTIFACT_PASSWORD`

Existing Android signing secrets remain environment-scoped and must never be copied into issues, commits, logs, documentation, or chat transcripts.

Authorized local decryption uses the separately held artifact password. Password values are never documented here.

## Supply-chain controls

GitHub Actions dependencies in `.github/workflows/` are pinned to immutable 40-character commit SHAs. Human-readable major-version comments are documentation only. Upgrades deliberately update the pinned SHA and pass hardening regression tests.

Workflow token permissions remain least-privilege. A future workflow must not request broader permissions unless necessary, separately reviewed, and documented.

Public pull requests must never receive release-signing, artifact-encryption, backend, or account-provider secrets. Release workflows remain environment-scoped.

C2 implementation adds separate Web/npm, shared-contract, and later Go/backend dependency/SBOM/security gates. These are additive; they do not replace existing mobile controls.

## Machine-enforced non-regression

`verification/reference/test_public_repository_hardening.py` currently checks the native public-repository security boundary, including that:

- normal CI does not publish ordinary installable application artifacts;
- external Actions are commit-SHA pinned;
- controlled Android release workflows are canonical-repository/main-only;
- checkout credentials do not persist in those release workflows;
- decoded keystores are cleaned up even after failure;
- signed public Actions release payloads are encrypted before upload; and
- this public security posture is documented from `README.md` and `SECURITY.md`.

During C2 implementation, equivalent tests must be extended for Web/Pages and any sync-service workflows, including browser-bundle secret exclusion and least-privilege deployment permissions.

The historical 22-family mobile traceability remains valid evidence for its recorded mobile scope. C2 product closure uses the newer 258-ID cross-platform traceability; the historical mobile closure must not be mistaken for Web/E2EE closure.

## Deliberate non-changes in this documentation alignment

This architecture/documentation reconciliation does **not** change:

- Sreva's Flutter product code in `lib/`;
- Android native capability templates in `platform_templates/android/`;
- iOS native capability templates in `platform_templates/ios/`;
- production package identity `com.sreva.health.sreva`;
- family-preview package identity `com.sreva.health.sreva.preview`;
- current `1.0.0+1` local-only runtime data flow;
- repository dedication/provenance; or
- v1 wellness/tracking regulatory boundary.

It **does** clarify that the future C2 product extends the local-sovereign core with optional ciphertext-only E2EE continuity, subject to separate protocol, implementation, privacy and release gates.

No software license is added by this security change. Public visibility alone is not a grant of rights beyond any license later explicitly added.

## GitHub settings outside version-controlled files

Repository settings are not fully enforceable from source. The hardening review reported `main` as unprotected and no repository rulesets at that time. Keep the following as explicit administration requirements:

1. Protect `main` or create an equivalent ruleset so PRs and required Sreva CI checks gate merges.
2. Keep the default Actions `GITHUB_TOKEN` read-only unless a workflow has a reviewed need for write access.
3. Do not allow fork-originated workflows to receive repository/environment secrets.
4. Enable secret scanning and push protection where available.
5. Keep `android-production` and `android-family-preview` environments restricted to intentional release use, with required reviewers where practical.
6. Add equivalent environment/secret separation for future sync-service deployment; static Web/Pages deployment must not share those secrets.

## Maintenance rule

Before changing release workflows, signing configuration, repository visibility, artifact handling, CI permissions, Web deployment, identity/sync infrastructure, or recovery handling, read this file together with:

- `SECURITY.md`;
- `PRIVACY.md`;
- `docs/superpowers/specs/2026-09-16-sreva-web-product-architecture-design.md`;
- `docs/verification/ANDROID_FORMAL_CLOSURE.md`; and
- the applicable platform release runbook.

Treat exposure of signing material, backend/recovery secrets, plaintext signed binaries from routine public CI, readable health payloads, weakened canonical release guards, unjustified workflow permissions, or bypassed Sreva verification gates as release-blocking regressions.

— **Girish Nallan Chakravathy**
