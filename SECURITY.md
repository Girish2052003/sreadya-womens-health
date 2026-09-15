# Security Policy

Sreva handles sensitive reproductive-health information. Security defects affecting confidentiality, integrity, authentication, backup/restore, notification privacy, or data deletion are release blockers.

## Non-negotiable rules

1. Never log menstrual dates, symptoms, notes, fertility data, sexual activity, pregnancy state, medication details, or HealthKit/Health Connect payloads.
2. Never add an analytics, advertising, crash-session replay, or remote logging SDK without a privacy/security review.
3. Device secrets belong in Keychain / Android Keystore-backed storage.
4. Backups must be encrypted before leaving the application sandbox.
5. Database migrations must be transactional and validated.
6. Pull requests that touch cryptography, HealthKit/Health Connect, backup/restore, migrations, notifications, or privacy require targeted tests.
7. Do not commit signing keys, App Store Connect keys, Play signing keys, provisioning profiles, or real user data.
