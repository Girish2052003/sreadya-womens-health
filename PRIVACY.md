# Sreadya Privacy Architecture

Last reviewed: 17 September 2026

Sreadya's core promise is simple: **the user's reproductive-health data is not a developer-readable health database.**

## Shipping privacy boundary

Sreadya has two equal first-class ways to use the product:

- **Account-free / sync off:** core health functionality works from the user's encrypted local vault without an account or network connection.
- **Optional account continuity / sync on:** an authorized client encrypts health content before it leaves that client. Sreadya's synchronization infrastructure stores ciphertext, wrapped key material, and only the minimum operational metadata required for account/device authorization and synchronization.

Account mode does not unlock stronger health features. Disabling sync must not disable local Sreadya, erase the local vault, or force the user to create another account.

Predictions, insights, reminder planning, doctor-report generation, and natural-language health interpretation remain client-side. The sync service is continuity infrastructure, not a health-intelligence engine.

## What optional continuity can expose to Sreadya infrastructure

A sync-enabled release may expose operational information needed to run the encrypted service, such as:

- opaque account, device, vault, object, event, and synchronization identifiers;
- device authorization/revocation state and public device-verification material;
- ciphertext and wrapped recovery/key envelopes;
- ciphertext sizes;
- protocol/schema versions, revision/version counters, and synchronization ordering;
- minimum timestamps needed for synchronization, authorization, replay protection, and service operation.

It must not expose readable period dates, flow, symptoms, sexual activity, fertility observations, pregnancy state, medication details, private notes, prediction inputs/results, or report contents to the synchronization service.

Sreadya infrastructure **does not possess the health-vault decryption key** and must not hold a universal or developer-accessible secret capable of deriving it.

## Account identity is not vault decryption

Passkeys and account sessions authorize account access. Where a release enables verified email or SMS recovery, those channels may help recover the account identity, but **email or SMS alone cannot decrypt an old encrypted health vault**.

Preferred continuity for a new device is approval by an existing trusted device. Emergency vault recovery uses the independent user-held recovery key. If every trusted device and the recovery key are lost, Sreadya can restore account control but cannot decrypt the previous health vault. The user may start a new vault; there is no hidden administrator recovery key.

Production email/SMS provider deployment is a separate release concern. If such providers are enabled, their address/number and delivery metadata must be reviewed and disclosed for that exact release. Repository implementation does not by itself prove a provider account has been configured.

## Retention and deletion

Local records remain under the user's device controls until edited, deleted, wiped, uninstalled, or replaced by a validated restore.

For account continuity, server-side account/device state, wrapped recovery material, and synchronized ciphertext remain only for the service purposes documented for the active account. The implemented account-deletion boundary removes server-side account and synchronized ciphertext state controlled by Sreadya. It **cannot remotely erase former device copies**, user-created exports, CycleVault backups, screenshots, or copies already sent to another destination. Those copies must be deleted where they are stored.

Revoking a device blocks future authorized synchronization; it does not make a false claim that historical local copies on that device were remotely destroyed.

## Account-free equality

Account-free Sreadya remains a complete health experience. It includes the encrypted local vault and applicable cycle tracking, logging, predictions, insights, reports, reminders, privacy controls, and backup functionality. Optional account mode adds encrypted continuity/recovery convenience only.

An account-free user can later enable account continuity without re-entering health history. A user can disable sync and continue locally.

## Web/PWA privacy boundary

The Web/PWA client uses application-layer encryption for sensitive browser persistence. Health records must not be placed in plaintext `localStorage`, sensitive URLs/query strings, analytics, session replay, ordinary logs, or service-worker caches.

Browser security is described accurately: WebCrypto/WebAuthn/browser storage protections are not automatically equivalent to Android Keystore or Apple Keychain/Secure Enclave. Platform differences may change the protection mechanism, not the product privacy promise.

## Health integrations, sharing, and backups

Health Connect and Apple Health integration are optional and permission-scoped. Platform health stores remain separate systems under their own platform rules.

Reports, partner summaries, CycleVault backups, and other exports leave Sreadya only after explicit user action. CycleVault backup encryption and its user-held passphrase remain separate from account-continuity recovery.

## Diagnostics and telemetry

Sreadya does not use advertising SDKs, behavioral analytics, remote session replay, or developer health-payload telemetry as the price of using the product. Diagnostics are restricted to reviewed operational metadata and must not contain readable reproductive-health payloads.

## Third-party/platform reality

Sreadya does not claim that no third party ever processes any device or account metadata. Apple/Google may process store downloads, operating-system backups, platform health records, notification-delivery metadata, or user-selected share destinations under their own terms. Verification providers may process delivery metadata if enabled for a release.

The enforceable product claim is narrower and stronger: **Sreadya's operator does not receive readable reproductive-health content for core operation or optional E2EE continuity.**

## Release-gate rule

Any sync-enabled release is blocked unless the implementation, this architecture, the public and in-app privacy policy, Privacy Center, support text, and applicable store declarations describe the same shipping behavior.

Before release, Google Play Data Safety/Health app declarations and, when native iOS distribution is active, Apple App Privacy disclosures must be re-evaluated against the **exact release binary and dependency set**. Repository CI verifies repository-controlled evidence; it does not fabricate proof that an external store-console submission or provider configuration has occurred.

Authoritative C2 architecture: `docs/superpowers/specs/2026-09-16-sreadya-web-product-architecture-design.md`.
