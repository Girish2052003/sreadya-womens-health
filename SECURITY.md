# Security Policy

Sreva handles sensitive reproductive-health information. Security defects affecting confidentiality, integrity, authentication, backup/restore, notification privacy, release signing, or data deletion are release blockers.

## Non-negotiable rules

1. Never log menstrual dates, symptoms, notes, fertility data, sexual activity, pregnancy state, medication details, or HealthKit/Health Connect payloads.
2. Never add an analytics, advertising, crash-session replay, or remote logging SDK without a privacy/security review.
3. Device secrets belong in Keychain / Android Keystore-backed storage.
4. Backups must be encrypted before leaving the application sandbox.
5. Database migrations must be transactional and validated.
6. Pull requests that touch cryptography, HealthKit/Health Connect, backup/restore, migrations, notifications, privacy, or release signing require targeted tests.
7. Do not commit signing keys, App Store Connect keys, Play signing keys, provisioning profiles, store credentials, private artifact passwords, or real user data.

## Public repository release boundary

This repository is public source. Public CI is verification-only for installable application binaries: Android and iOS builds may be compiled and tested, but normal CI must not publish APK, AAB, or unsigned iOS application bundles as downloadable artifacts.

Production and family-preview Android releases are manually dispatched from the canonical repository on `main`. Signing credentials and release-artifact encryption passwords are environment-scoped GitHub secrets. Signed release payloads must be encrypted before any Actions artifact upload, and decoded keystores plus plaintext staging material must be removed in an `always()` cleanup step.

External GitHub Actions used by Sreva workflows must be pinned to immutable commit SHAs. Workflow permissions remain least-privilege (`contents: read`) unless a separately reviewed change proves a broader permission is necessary.

The maintained public-repository protection state and release-boundary rationale are documented in `docs/security/PUBLIC_REPOSITORY_HARDENING.md`.

Do not publish vulnerability reports containing secrets, real health data, signing material, or private user exports in a public issue.
