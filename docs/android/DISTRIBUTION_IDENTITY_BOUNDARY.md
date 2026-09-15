# Sreva Distribution Identity Boundary

This document freezes the release boundary shared by the public-production and family-preview Android builds.

## Product identity

Both distributions are **Sreva**. They are built from the same product source, domain model, privacy architecture, prediction/reminder engines, encrypted local vault, reports, accessibility behavior, platform-health integration, and capability set defined by the Sreva master specification.

The family preview is not a reduced or toy edition. Its only intended product-level difference is its Android install/distribution identity.

## Android application IDs

- Production: `com.sreva.health.sreva`
- Family preview: `com.sreva.health.sreva.preview`

The preview configuration changes `applicationId` only. The Android namespace remains `com.sreva.health.sreva` so the audited native bridge and Kotlin package identity are unchanged.

## Personal dedication boundary

The repository may preserve the private origin/provenance dedication that records who inspired Sreva. That dedication is **repository provenance only**.

Personal names from that dedication must not be rendered in distributable runtime surfaces, including onboarding, home screens, settings, notifications, reports, exports, diagnostics, store copy, or family-preview/public-production UI.

This boundary protects family privacy without erasing the project's origin from its private development record.

## Non-regression rule

A distribution-identity change must not remove, disable, weaken, relabel, or silently bypass Sreva's implemented core capability families or architectural laws. Any future intentional product-scope change requires its own reviewed specification change and verification evidence.
