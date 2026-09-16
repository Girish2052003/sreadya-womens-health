# Sreva Distribution Identity Boundary

This document freezes the release boundary shared by the public-production and family-preview **Android** builds.

> **C2 scope note:** Android is one of three equal first-class Sreva clients alongside iOS and Web/PWA. The authoritative cross-platform specification is `docs/superpowers/specs/2026-09-16-sreva-web-product-architecture-design.md`. This file governs Android distribution identity only; it does not define or limit the wider Sreva product architecture.

## Product identity

Both Android distributions are **Sreva**. They are built from the same Flutter/mobile product source, domain model, privacy architecture, prediction/reminder engines, encrypted local vault, reports, accessibility behavior, platform-health integration, and applicable capability set. Those mobile semantics must remain conformant with the canonical C2 shared contract used by Android, iOS, and Web/PWA.

The family preview is not a reduced or toy edition. Its only intended product-level difference is its Android install/distribution identity.

## Android application IDs

- Production: `com.sreva.health.sreva`
- Family preview: `com.sreva.health.sreva.preview`

The preview configuration changes `applicationId` only. The Android namespace remains `com.sreva.health.sreva` so the audited native bridge and Kotlin package identity are unchanged.

## Personal dedication boundary

The repository may preserve the project-origin/provenance dedication that records who inspired Sreva. That dedication is **repository provenance only**.

Personal names from that dedication must not be rendered in distributable runtime surfaces, including onboarding, home screens, settings, notifications, reports, exports, diagnostics, store copy, or family-preview/public-production UI.

This boundary protects family privacy without erasing the project's origin from repository provenance.

## Non-regression rule

A distribution-identity change must not remove, disable, weaken, relabel, or silently bypass Sreva's implemented core capability families or cross-platform architectural laws. Any future intentional product-scope change requires its own reviewed specification amendment and verification evidence.
