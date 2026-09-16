# Sreva Privacy Architecture

Sreva's core promise is simple: **the user's reproductive-health data is not a developer-readable health database.**

## Current implemented release boundary

The currently implemented Flutter mobile baseline stores core cycle/health data locally on the user's device. Prediction, insight generation, reminder planning, doctor-report generation, and natural-language command parsing are designed to operate locally. Core health functionality does not require a Sreva account or network connection.

The current `1.0.0+1` mobile runtime does **not** silently operate a Sreva health-sync backend merely because an optional encrypted-continuity architecture has now been approved for future implementation.

Platform health integrations are optional and permission-scoped. User-controlled exports leave the application only after explicit share/export action.

## Approved C2 privacy architecture

Sreva is now designed as one product with three equal first-class clients: Android, iOS, and Web/PWA. Account-free and account-based experiences retain the same core health capabilities.

An optional future account mode may add end-to-end encrypted continuity between authorized devices. If enabled after implementation and release review:

- health content is encrypted on the authorized client before synchronization;
- the sync service stores ciphertext plus only the minimum operational metadata needed for synchronization/device management;
- Sreva infrastructure must not possess the key required to decrypt the user's reproductive-health vault;
- email/SMS account recovery must not by itself decrypt old health history;
- trusted-device approval and a user-held recovery key form the vault-recovery boundary;
- losing every trusted device and the recovery key can make the old encrypted vault unrecoverable;
- disabling sync must not disable local core Sreva.

This means “no developer reproductive-health database” is interpreted precisely as **no plaintext or developer-decryptable reproductive-health database**. Optional ciphertext synchronization does not authorize Sreva to inspect menstrual history.

## Account-free equality

No-account mode remains a complete health experience. It includes the local encrypted vault and applicable cycle tracking, logging, predictions, insights, reports, reminders, privacy controls, and backup functionality. Account mode adds encrypted continuity/recovery conveniences, not stronger health features.

## Web/PWA privacy boundary

The approved Web/PWA client must use application-layer encryption for sensitive browser persistence. Health records must not be placed in plaintext `localStorage`, sensitive URLs/query strings, analytics, session replay, ordinary logs, or service-worker caches.

Browser security must be described accurately: WebCrypto/WebAuthn/browser storage protections are not automatically equivalent to Android Keystore or Apple Keychain/Secure Enclave. Platform differences may change the protection mechanism, not the product's privacy intent.

## Third-party/platform reality

Sreva must not claim that no third party ever processes any device or account metadata. Apple/Google may process store downloads, operating-system backups, platform health records, push-delivery metadata, or user-selected share destinations under their own terms. Email/SMS verification providers may process delivery metadata if account recovery is enabled in a future release.

The enforceable product claim is narrower and stronger: **Sreva's operator does not receive readable reproductive-health content for core operation or optional E2EE continuity.**

## Release-gate rule

The approved E2EE/account architecture is **not yet a statement of currently shipping data flow**. Before any released client actually transmits encrypted user-health ciphertext to Sreva-operated infrastructure, the implementation must pass the C2 protocol/security/conformance gates and every applicable public privacy policy, Google Play Data Safety/health declaration, Apple privacy disclosure, and support document must be updated to describe the exact shipping behavior.

Authoritative C2 architecture: `docs/superpowers/specs/2026-09-16-sreva-web-product-architecture-design.md`.
