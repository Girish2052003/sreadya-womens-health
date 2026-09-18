# SREADYA Globalization Architecture

**Status:** ACCEPTED — authoritative architecture  
**Repository:** `Girish2052003/sreva-womens-health`  
**Adopted:** 2026-09-18  
**Scope:** Existing Web/PWA + Flutter Android/iOS + all future SREADYA content surfaces  
**Authoritative home:** This document. Implementation documents must link here instead of redefining the architecture.

---

## 1. Executive decision

SREADYA will evolve the **existing repository**. This is not a rewrite and not a new parallel project.

The existing Web/PWA, Flutter applications, privacy model, tests, deployment workflows, content, routes, and product behaviour remain the starting point. The current localization scaffolding is upgraded into a permanent, provider-neutral globalization platform.

The target is:

- one authoritative source language and content model;
- user-selectable global language support that can scale beyond 500 enabled locales;
- one language contract for current and future pages;
- no requirement to hand-maintain hundreds of translations;
- no translation API keys in clients;
- no translation of private user health data by default;
- no requirement for a custom runtime translation server at the current scale;
- no framework, cloud, translation-vendor, hosting-vendor, or database lock-in;
- support for very large future content collections without generating one HTML page per locale per content item.

The architectural promise is **not** that today's implementation technologies will last for centuries. No responsible architecture can guarantee that. The promise is that the **contracts, identifiers, data ownership, portability, and boundaries are designed so technologies can be replaced without rewriting product content or user-facing application logic**.

---

## 2. Non-negotiable product invariants

These rules survive framework and infrastructure changes.

### 2.1 Pages never own language

User-visible text MUST be referenced through stable message/content identifiers.

Bad:

```tsx
<h1>Your cycle, your context, your private space.</h1>
```

Required direction:

```tsx
<h1>{t('home.hero.title')}</h1>
```

Page structure may change. The message identity remains stable.

### 2.2 Stable content identity is independent of routes

A URL is not the identity of content.

A future article may have:

```text
contentId = womens-health.article.9384248
```

Its route may later change, but translations remain attached to the stable content ID.

### 2.3 English is the authoritative source, not the only language

English is the source-of-truth language for authored SREADYA product copy unless a future governance decision changes the source locale.

A locale may contain:

- source content;
- machine translation;
- human-reviewed translation;
- stale translation;
- missing translation.

The application MUST never misrepresent machine-translated copy as professionally reviewed.

### 2.4 Translation providers are adapters

SREADYA MUST NOT depend on one translator.

Google, Microsoft, DeepL, an LLM, an open model, a local model, a human translator, or a future provider are implementations behind a SREADYA-owned interface.

Changing providers MUST NOT require page rewrites.

### 2.5 Private health data is outside the translation pipeline

The normal localization pipeline may translate SREADYA-owned static product content such as:

- navigation;
- labels;
- help text;
- educational content;
- accessibility copy;
- installation guidance;
- settings;
- product explanations.

It MUST NOT silently send user-created or user-health content to translation providers, including:

- cycle history;
- symptom history;
- medication entries;
- fertility observations;
- private notes;
- journals;
- reports containing personal health information;
- account or recovery secrets.

Any future feature that translates user content requires an explicit, separate privacy design and consent boundary.

### 2.6 Failure is graceful

Missing translations MUST NOT break pages.

Default fallback:

```text
requested locale
    ↓
language/script parent
    ↓
language parent
    ↓
English source
```

Example:

```text
pt-BR → pt → en
```

Fallback behaviour must be deterministic and testable.

---

## 3. Standards boundary

SREADYA uses open standards at system boundaries.

### 3.1 Locale identity

Use canonical **BCP 47** language tags.

Examples:

```text
en
en-GB
en-IN
ta
ta-IN
fi-FI
ar-SA
zh-Hans
zh-Hant
pt-BR
```

Application code MUST NOT invent proprietary locale identifiers when a valid BCP 47 representation exists.

### 3.2 Locale metadata

Use **Unicode CLDR / UTS #35** as the primary reference for locale conventions such as:

- native language names;
- writing direction;
- dates;
- numbers;
- currencies;
- units;
- plural rules;
- scripts;
- collation;
- likely subtags.

The architecture does not hard-code a tiny RTL list as the long-term source of truth.

### 3.3 Encoding and portability

Canonical globalization data is UTF-8 and stored in a documented, versioned, portable representation.

The contract MUST be readable without Next.js, Flutter, GitHub, or any particular translation SDK.

### 3.4 Message syntax

SREADYA owns a **versioned message contract** rather than exposing a framework-specific message API directly to product code.

Initial implementations may compile to current Flutter ARB/ICU-compatible messages and web message bundles.

The contract contains a `messageSyntaxVersion` field so a future migration to MessageFormat 2 or another standard does not force stable message IDs to change.

This intentionally avoids making an evolving message-format implementation the permanent product boundary.

---

## 4. Permanent SREADYA globalization model

The architecture is separated into five layers.

```text
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCT SURFACES                         │
│       Web/PWA          Android          iOS       Future     │
└─────────────────────────────┬───────────────────────────────┘
                              │
                     SREADYA I18N API
                    t(key, params, locale)
                              │
┌─────────────────────────────┴───────────────────────────────┐
│                  GLOBALIZATION CONTRACT                     │
│ stable IDs · fallback · locale registry · provenance        │
└───────────────┬────────────────────────────┬────────────────┘
                │                            │
       UI MESSAGE CATALOGUE             CONTENT CATALOGUE
      small/stable product UI       potentially millions of items
                │                            │
                └──────────────┬─────────────┘
                               │
                     TRANSLATION PIPELINE
                               │
                 provider-neutral translation router
                               │
             build artifacts / future content store
```

The public application consumes the SREADYA I18N API. It does not know which provider created a translation or where translations are physically stored.

---

## 5. Canonical message contract

Create one canonical source catalogue under shared product ownership.

Proposed authoritative location:

```text
shared/i18n/
├── schema/
├── source/
├── locales/
├── glossary/
└── generated/
```

Generated platform-specific files are derivatives, not authoritative sources.

A canonical message record conceptually contains:

```json
{
  "id": "home.hero.title",
  "sourceLocale": "en",
  "source": "Your cycle, your context, your private space.",
  "description": "Homepage hero headline",
  "domain": "marketing",
  "risk": "general",
  "messageSyntaxVersion": "sreadya-message-v1",
  "placeholders": {},
  "doNotTranslate": [],
  "sourceVersion": "sha256:..."
}
```

Important properties:

- **ID is stable.** Editing English text does not rename the ID.
- **sourceVersion is content-derived.** Changed source text automatically makes older translations stale.
- **description is mandatory for ambiguous copy.**
- **risk is explicit.**
- **placeholders are typed and validated.**
- brand names and protected terminology can be declared non-translatable.

---

## 6. Two translation systems, one contract

UI localization and massive editorial/content localization have different scaling needs and MUST NOT be conflated.

### 6.1 UI message catalogue

Used for:

- buttons;
- navigation;
- settings;
- dialogs;
- error messages;
- accessibility labels;
- common product copy.

Characteristics:

- relatively small;
- eagerly or lazily bundled by locale;
- strongly CI-enforced;
- shared identifiers across Web and Flutter.

### 6.2 Content catalogue

Used for:

- articles;
- help pages;
- wellness explanations;
- future knowledge content;
- potentially millions of records.

Each content item has a stable content ID and structured fields.

Concept:

```json
{
  "contentId": "womens-health.article.9384248",
  "sourceLocale": "en",
  "schemaVersion": 1,
  "fields": {
    "title": "...",
    "summary": "...",
    "body": "..."
  }
}
```

Translations are stored as locale variants of that content ID.

This allows:

```text
1 item
100 items
100,000 items
10,000,000 items
```

without changing page implementation.

---

## 7. Locale registry

SREADYA owns a canonical locale registry.

Proposed location:

```text
shared/i18n/locales/registry.json
```

Each enabled locale record includes, where known:

```json
{
  "tag": "ta-IN",
  "language": "ta",
  "script": "Taml",
  "region": "IN",
  "nativeName": "தமிழ்",
  "englishName": "Tamil",
  "direction": "ltr",
  "parent": "ta",
  "status": "enabled",
  "coverage": "machine",
  "frameworkSupport": {
    "web": true,
    "flutterFrameworkWidgets": true
  }
}
```

Rules:

1. BCP 47 is the identifier.
2. CLDR supplies conventions where available.
3. Provider support is metadata, never locale identity.
4. A locale can exist even if one provider cannot translate it.
5. A language appears publicly only when SREADYA has a usable translation/fallback policy for it.
6. Country flags MUST NOT be used as the primary representation of languages.
7. The selector shows native names prominently and remains searchable by English name, native name, tag, and script.

Architecture capacity is not artificially limited to 500 locales. Product rollout may enable 500+ when translation quality and artifacts exist.

---

## 8. Translation provenance and risk

Every translation artifact must carry provenance.

Conceptual record:

```json
{
  "id": "home.hero.title",
  "locale": "ta-IN",
  "sourceVersion": "sha256:...",
  "translationVersion": "sha256:...",
  "method": "machine",
  "provider": "provider-id",
  "providerModel": "model-or-api-version",
  "createdAt": "2026-09-18T00:00:00Z",
  "reviewStatus": "unreviewed"
}
```

Allowed review states:

```text
source
machine-unreviewed
human-reviewed
stale
missing
```

Recommended content-risk levels:

```text
standard-ui
general-content
sensitive-health
safety-critical
legal-consent
```

Default publication policy:

- **standard-ui:** machine translation may publish after automated validation.
- **general-content:** machine translation may publish with provenance; review is desirable.
- **sensitive-health:** machine translation may be available, but review state must remain visible to system policy and source English must remain accessible.
- **safety-critical:** machine output must never be labelled reviewed; product design should provide authoritative-source access and may require qualified review before treating the localized wording as authoritative.
- **legal-consent:** jurisdiction-specific review requirements override automation.

This allows users to benefit from broad language access without overstating translation assurance.

---

## 9. Translation pipeline

Translation is primarily a **build/CI content-production activity**, not a visitor-time dependency.

```text
English source change
        │
        ▼
catalogue validation
        │
        ▼
source hash comparison
        │
        ├── unchanged → reuse translation memory
        │
        └── changed
              │
              ▼
      Translation Router
      ↙       ↓        ↘
 Provider A Provider B Local/LLM/Human
             │        /
             │       /
        ▼     ▼      ▼
     automated QA
        │
        ▼
 provenance + status
        │
        ▼
 generated locale artifacts
        │
        ▼
 build / deploy
```

### 9.1 Incremental translation

Do not retranslate unchanged strings.

Translation memory is keyed by stable message/content identity and source hash.

A normal release translates only new or changed material.

### 9.2 Provider router

Define a SREADYA-owned interface similar to:

```text
capabilities()
translate(request)
estimate(request)
health()
```

The router decides providers based on:

- locale support;
- quality profile;
- content risk;
- cost;
- rate limits;
- privacy/retention terms;
- provider availability.

Provider credentials exist only in secure CI/build infrastructure or future protected backend infrastructure.

They MUST NOT be embedded in public Web/PWA JavaScript or mobile distributables.

### 9.3 Quality gates

Before publication, generated translations are checked for at least:

- missing placeholders;
- changed placeholder names;
- malformed message syntax;
- missing/empty output;
- accidental untranslated protected tokens;
- unexpected HTML/script injection;
- locale/tag mismatch;
- source-version mismatch;
- bundle schema mismatch.

Future quality models may be added behind this boundary.

---

## 10. Current hosting strategy: no custom translation server required

Today, the Web/PWA remains compatible with GitHub Pages and Next.js static export.

Generated Web bundles may be published as static assets:

```text
/i18n/manifest.json
/i18n/en/<hash>.json
/i18n/ta/<hash>.json
/i18n/fi/<hash>.json
...
```

Runtime flow:

```text
user chooses locale
      ↓
browser loads static locale bundle
      ↓
browser/PWA cache stores it
      ↓
SREADYA renders using that bundle
```

No runtime translation provider call is required.

No custom translation server is required.

The PWA/service worker may cache language bundles using versioned artifact names. Old caches may be safely evicted after new manifests become active.

---

## 11. Web runtime contract

The Web/PWA must provide one `LanguageProvider`/resolver boundary.

Conceptual API:

```ts
t(messageId, params?)
locale()
setLocale(tag)
direction()
formatDate(...)
formatNumber(...)
formatUnit(...)
```

Rules:

- first-run locale can use browser language preferences;
- explicit user selection always wins;
- selection persists locally;
- `<html lang>` and `dir` update from the active locale;
- language selection is available globally, not hidden only inside Settings;
- untranslated keys fall back deterministically;
- user-facing hard-coded English in components is prohibited after migration;
- raw translated HTML is prohibited unless processed through a strictly defined safe rich-text format.

### 11.1 Search/selector UX

The selector must support hundreds of locales without a 500-item traditional select box.

Required behaviour:

- search;
- native language name;
- English name;
- script/tag matching;
- recently used languages;
- browser-suggested languages;
- alphabetic browsing;
- accessibility by keyboard and screen reader;
- no country-flag-as-language assumption.

### 11.2 SEO and static export

Runtime localization and localized SEO are separate concerns.

At today's scale, SREADYA may keep a single route per page and localize client-visible content through bundles.

It MUST NOT multiply every route by every locale merely to claim language support.

If localized SEO becomes strategically important, the rendering adapter may later provide:

- selected pre-rendered high-value locale pages;
- locale-specific canonical URLs;
- SSR/edge rendering;
- localized metadata and `hreflang`.

That infrastructure change must not alter message/content IDs.

---

## 12. Flutter Android/iOS contract

Flutter already has `l10n.yaml`, ARB scaffolding, and `AppLocalizations`.

That investment is preserved.

However, app code should progressively depend on a SREADYA localization facade rather than assuming ARB is the permanent canonical store.

### Near term

- generate Flutter ARB inputs from the canonical SREADYA source/translation data;
- keep `gen_l10n` for framework integration;
- preserve `AppLocalizations.supportedLocales` where practical;
- add the same locale selection and fallback semantics as Web.

### Long term

Hundreds of full locale catalogues must not force unnecessary mobile binary growth.

The localization facade permits migration to:

- embedded baseline language packs;
- lazy/downloadable signed language packs;
- generated asset bundles;
- platform-specific optimized storage.

The product API remains unchanged.

Framework widget localization may use Flutter-supported locale data when available and a documented fallback when not.

---

## 13. Large-scale future: 10,000,000 content items

Today's `output: 'export'` remains appropriate for the current finite site.

It is **not** the final serving model for ten million content items.

The future content architecture is:

```text
             PAGE/VIEW SHELL
                   │
          stable content ID
                   │
             ContentResolver
             ↙            ↘
        source store    translation store
                         /
                        /
               locale resolver
                    │
                 render
```

At large scale:

- content lives in a content store/object store/database;
- translations live in sharded locale/content artifacts or a translation store;
- CDN caching may be introduced;
- rendering may be browser, edge, server, native, or another future platform;
- builds do not enumerate all content × locale combinations;
- routes resolve stable content IDs;
- storage and hosting are replaceable adapters.

Thus:

```text
10,000,000 content items × 500 locales
```

does **not** imply five billion pre-generated HTML files.

The language/content contract remains the same whether storage is JSON today or a distributed content platform later.

---

## 14. CI enforcement

After migration, globalization rules become build laws.

CI must eventually reject:

### 14.1 Hard-coded user-visible copy

Examples to catch:

- JSX text;
- button labels;
- accessibility labels;
- tooltips;
- placeholders;
- page metadata;
- error messages;
- Flutter `Text` literals and comparable UI properties.

Allow-lists may exist only for documented cases such as test fixtures, protocol literals, data identifiers, and intentionally non-localized brand tokens.

### 14.2 Invalid or missing catalogue references

Every referenced message ID must exist in the authoritative source catalogue.

### 14.3 Placeholder incompatibility

Translated messages must preserve required variables and valid types.

### 14.4 Stale translation state

A translation whose `sourceVersion` no longer matches the source must become stale automatically.

### 14.5 Locale registry invalidity

Locale tags, parents, direction, and uniqueness are validated.

### 14.6 RTL and expansion regressions

CI includes pseudo-locale tests:

- text expansion;
- long-word handling;
- bidirectional/RTL layouts;
- mirrored navigation expectations where appropriate.

### 14.7 Bundle budgets

Language support must not silently destroy page/app performance.

CI tracks:

- per-locale bundle size;
- initial bundle size;
- lazy-loaded bundle size;
- missing-key rate;
- fallback rate in tests.

---

## 15. Testing strategy

Minimum test layers:

1. catalogue/schema tests;
2. locale-resolution tests;
3. fallback-chain tests;
4. placeholder/plural tests;
5. Web language-switch tests;
6. persistence tests;
7. RTL layout tests;
8. Unicode/script rendering tests;
9. accessibility tests;
10. PWA/offline language-bundle tests;
11. Flutter locale-switch tests;
12. source-hash/staleness tests;
13. provider-adapter contract tests;
14. translation-pipeline dry-run tests;
15. English baseline regression tests.

The English product must remain functionally unchanged when globalization is introduced.

---

## 16. Security, privacy, and integrity

### 16.1 Client secrets

No translation API secret enters frontend code, PWA assets, mobile resources, or public repository history.

### 16.2 Translation input boundary

Only approved SREADYA-owned source content enters automated translation providers.

### 16.3 Safe rendering

Translations are data, never trusted executable code.

Rich text uses an allow-listed structured representation rather than arbitrary translated HTML.

### 16.4 Artifact integrity

Generated bundles use content-addressed/versioned names and a manifest containing hashes.

This permits safe caching, rollback, and reproducible releases.

### 16.5 Supply-chain governance

Translation providers are reviewed for:

- data retention;
- model-training use;
- geographical/legal requirements;
- service terms;
- availability;
- cost;
- incident response.

Provider governance is separate from product localization semantics.

---

## 17. Migration from the current repository

The current architecture is upgraded in place.

Current assets preserved:

- `web/src/i18n/locale.ts`;
- `web/src/i18n/messages/en.json`;
- current locale preferences;
- `l10n.yaml`;
- `lib/l10n/app_en.arb`;
- Flutter localization delegates;
- current Web/PWA routes;
- current tests and release workflows;
- current GitHub Pages deployment;
- privacy-first/local-first product boundaries.

Migration sequence:

1. create the canonical shared i18n schema and source catalogue;
2. create canonical locale registry and fallback resolver;
3. introduce Web localization facade;
4. migrate current Web message catalogue into the canonical source;
5. migrate homepage/header/footer;
6. migrate public-route content;
7. migrate workspace UI;
8. migrate policy/help/health content with risk metadata;
9. generate Web locale artifacts;
10. generate Flutter ARB derivatives;
11. add language selector and persistence;
12. add provider-neutral translation adapters;
13. add source hashing and translation memory;
14. add provenance;
15. add CI hard-coded-copy gate;
16. add catalogue and placeholder gates;
17. add RTL/pseudo-locale tests;
18. add PWA offline language-bundle tests;
19. add Flutter parity tests;
20. deploy preview;
21. prove English baseline unchanged;
22. enable initial machine-translated locales;
23. expand locale coverage incrementally;
24. merge only after all required gates are green.

This sequence may be implemented through bounded PRs. The architecture itself remains one contract.

---

## 18. What is deliberately NOT done

SREADYA will not:

- create a second globalization project;
- fork the product into one app/site per language;
- build one source page per locale;
- expose translator credentials in clients;
- call a paid translator on every page view;
- send private health data for translation by default;
- hand-maintain 500 giant catalogues;
- hard-code one translation provider into page code;
- make GitHub Pages a permanent scale assumption;
- make Next.js or Flutter resource formats canonical business data;
- claim every machine translation is human-reviewed;
- pre-render billions of locale/page combinations;
- use country flags as a substitute for language identity.

---

## 19. Technology replacement rule

The following are adapters and MAY be replaced:

```text
Next.js
React
Flutter
GitHub Pages
GitHub Actions
PWA cache implementation
translation vendors
database/content store
CDN
message-format runtime
mobile packaging
```

The following are SREADYA-owned contracts and MUST remain stable or be explicitly version-migrated:

```text
stable message IDs
stable content IDs
source-locale ownership
locale identity
fallback semantics
translation provenance
risk classification
privacy boundary
translation-provider interface
content-resolver interface
CI globalization rules
portable export/import format
```

This separation is the core long-term durability decision.

---

## 20. Operational simplicity rule

Future developers should not need globalization expertise to add normal pages.

The normal workflow must become:

```text
1. create page/content
2. reference stable message/content IDs
3. write English source once
4. commit
5. CI identifies new/changed source
6. translation pipeline produces eligible locale variants
7. tests validate
8. deployment publishes
```

No developer should manually edit hundreds of locale files for a normal feature.

If a developer writes new user-visible hard-coded copy, CI should explain exactly how to move it into the contract.

---

## 21. Company and user success criteria

This architecture succeeds when:

### For users

- language selection is easy and global;
- selected language persists;
- pages do not break when translations are incomplete;
- machine-translated content is not misrepresented as reviewed;
- private health content remains private;
- RTL and non-Latin scripts are first-class;
- language loading is fast and offline-friendly after caching.

### For the company

- translation work is incremental;
- translation providers are replaceable;
- cost is bounded and measurable;
- unchanged text is not retransmitted/retranslated;
- future frameworks can change without reauthoring content;
- future hosting can move beyond GitHub Pages without changing page language semantics;
- millions of content items do not require billions of static outputs;
- one CI contract prevents globalization regressions.

---

## 22. Architecture acceptance statement

SREADYA adopts a **standards-based, stable-ID, provider-neutral, privacy-preserving, risk-aware, build-first globalization architecture**.

Today:

```text
existing repo
+ static Web/PWA
+ Flutter
+ GitHub Pages
+ generated language bundles
```

Future:

```text
same stable language/content contract
+ replaceable translation providers
+ replaceable storage
+ replaceable rendering
+ CDN/content platform when scale requires it
```

The platform may evolve. The contract survives.

That is the SREADYA globalization foundation.

---

## 23. Normative references

- IETF BCP 47 / RFC 5646 — Tags for Identifying Languages: https://www.rfc-editor.org/info/bcp47/
- Unicode CLDR: https://cldr.unicode.org/
- Unicode UTS #35 (LDML): https://unicode.org/reports/tr35/
- Unicode MessageFormat 2 project: https://messageformat.unicode.org/
- Flutter internationalization: https://docs.flutter.dev/ui/internationalization
- Next.js static exports: https://nextjs.org/docs/app/guides/static-exports

