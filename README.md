# Sreva

**A private, local-first women's cycle companion.**

> Internal dedication: **For Sree Kutty.** Public product name: **Sreva**.

Sreva is designed so menstrual and reproductive-health data remains on the user's device. Core tracking, prediction, reminders, insights, reports, and assistant intent parsing are local-first and usable without an account or internet connection.

## Product principles

- Device is the authoritative health datastore.
- No developer-operated reproductive-health database.
- Core features work offline and without an account.
- Predictions and insights run on-device.
- Period reminders use OS-local scheduling.
- HealthKit / Health Connect access is granular and opt-in.
- Sensitive health values never enter normal logs or analytics.
- Updates are distributed as signed application releases.
- Database migrations are transactional and preserve history.
- V1 is a wellness/tracking product, not a diagnostic or contraceptive medical device.

## Targets

- First production target: iPhone 17, minimum iOS 17.
- Cross-platform product: iOS + Android from the same Flutter codebase, with native Swift/Kotlin adapters where platform APIs require them.
- Flutter stable line: 3.47.x.

## Repository status

This repository starts as a private development repository. Do not commit real health data, diagnostic exports containing health values, Apple signing materials, or store credentials.

See `docs/superpowers/specs/2026-09-15-sreva-master-design.md` and `docs/superpowers/plans/2026-09-15-sreva-v1-implementation.md`.
