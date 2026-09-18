# Sreadya Distribution Identity Boundary

> **C2 scope note — 16 September 2026:** This original Android distribution-identity boundary is preserved in full. Android is now one of three equal first-class Sreadya clients alongside iOS and Web/PWA. The authoritative cross-platform constitution is `docs/superpowers/specs/2026-09-16-sreadya-web-product-architecture-design.md`. This file governs Android production/family-preview identity only and must not be read as limiting the wider Sreadya product architecture.

This document freezes the release boundary shared by the public-production and family-preview Android builds.

## Product identity

Both distributions are **Sreadya**. They are built from the same product source, domain model, privacy architecture, prediction/reminder engines, encrypted local vault, reports, accessibility behavior, platform-health integration, and capability set defined by the Sreadya master specification.

The family preview is not a reduced or toy edition. Its only intended product-level difference is its Android install/distribution identity.

## Android application IDs

- Production: `com.sreadya.health.sreadya`
- Family preview: `com.sreadya.health.sreadya.preview`

The preview configuration changes `applicationId` only. The Android namespace remains `com.sreadya.health.sreadya` so the audited native bridge and Kotlin package identity are unchanged.

## Personal dedication boundary

The repository may preserve the private origin/provenance dedication that records who inspired Sreadya. That dedication is **repository provenance only**.

Personal names from that dedication must not be rendered in distributable runtime surfaces, including onboarding, home screens, settings, notifications, reports, exports, diagnostics, store copy, or family-preview/public-production UI.

This boundary protects family privacy without erasing the project's origin from its private development record.

## Non-regression rule

A distribution-identity change must not remove, disable, weaken, relabel, or silently bypass Sreadya's implemented core capability families or architectural laws. Any future intentional product-scope change requires its own reviewed specification change and verification evidence.

Under C2, those architectural laws include the cross-platform shared contract and parity rules. The production/preview identity distinction still must not create a reduced Sreadya edition.
