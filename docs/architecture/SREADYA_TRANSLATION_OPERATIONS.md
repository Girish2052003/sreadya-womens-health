# SREADYA Machine Translation Operations

**Authority:** `docs/architecture/SREADYA_GLOBALIZATION_ARCHITECTURE.md`  
**Purpose:** Operational runbook for provider-backed globalization. This document does not redefine architecture.

## Production model

SREADYA authors English once and generates non-English locale artifacts in protected build infrastructure.

```text
English catalogue
    ↓
source/hash diff
    ↓
Google Cloud Translation
    ↓
QA
    ↓
complete locale artifacts
    ↓
manifest
    ↓
Web/PWA/mobile derivatives
```

The browser never owns a Google Cloud credential and never performs paid provider translation directly.

## Provider baseline

The repository freezes exactly **194 logical Google NMT rows** as the minimum provider baseline from Google's 2026-09-16 published NMT table.

The provider is queried dynamically during translation/release preparation. The discovered set must contain every frozen baseline target. New provider targets are accepted as additions; the floor must never silently shrink.

## Authentication

Supported deployment patterns:

1. **Preferred:** GitHub OIDC → Google Workload Identity Federation → short-lived access token.
2. **Transitional:** protected GitHub Actions secret containing a Google Cloud Translation API key.

No credential may be committed or emitted into client/public assets.

Expected CI inputs are documented by the translation tool/workflow. Local developers may use environment variables but must never commit their values.

A paid translation run is additionally bounded by the non-secret repository variable `SREADYA_TRANSLATION_MAX_CHARACTERS`. The orchestrator calculates the exact provider-input character plan before sending any text and refuses to translate when the plan exceeds that reviewed ceiling. An absent ceiling fails closed.

## Incremental translation

The translation tool compares the current English source with existing target artifacts.

- unchanged source values are reused;
- new or changed values are sent to the provider;
- removed source keys are removed from regenerated artifacts;
- partial artifacts remain private/unpublished until complete;
- publication requires 100% key and placeholder parity.

## Protected material

Before provider calls, placeholders are tokenized. After translation they are restored and verified.

Protected product terms are validated after translation. The default list includes SREADYA, CycleVault, FORGE, NC CORP, WebCrypto, IndexedDB, PIN, E2EE, and PWA.

## Public chooser

The chooser is generated from the published/validated manifest only.

It must never enumerate the raw CLDR universe and must never show raw fallback-only rows.

## RTL handling

RTL text is rendered with locale-aware text direction without using document direction as a global layout-mirroring mechanism.

## Release gates

A release is not globalization-complete unless:

- frozen baseline count is 194;
- provider discovery contains all baseline targets;
- every published target artifact is complete and current;
- representative cross-script UI tests pass;
- no raw fallback rows are visible;
- no translation credential is present in public/client content;
- live GitHub Pages verification passes after deployment.

## Large content scale

UI messages remain bundle-oriented. Future large editorial content is resolved by stable content ID and stored/cached independently so millions of content items do not multiply into billions of pre-rendered locale pages.
