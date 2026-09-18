# SREADYA Globalization Architecture

**Status:** ACCEPTED — authoritative architecture v2  
**Repository:** SREADYA product repository  
**Adopted:** 2026-09-18  
**Scope:** Existing Web/PWA + Flutter Android/iOS + all future SREADYA product/content surfaces  
**Authoritative home:** This document. Implementation documents must cross-reference it rather than redefine the contract.

---

## 1. Executive decision

SREADYA keeps the existing product and replaces manual locale authoring with a **machine-first, build-time globalization pipeline**.

The user experience target is intentionally simple:

```text
SREADYA owns the UI and language selector
        +
Google Cloud Translation does the translation work
        +
validated locale bundles are published with the product
        =
one coherent translated SREADYA experience
```

The browser never calls Google Cloud Translation directly. Translation credentials never enter Web/PWA JavaScript, mobile binaries, static assets, or public repository history.

English remains the single canonical authored source language. Developers write product copy once, through stable message IDs. New or changed English strings are translated automatically by CI/build infrastructure. Unchanged strings are reused from translation memory.

The current Google Cloud Neural Machine Translation (NMT) baseline is frozen in-repository as **194 logical language rows** from Google's published NMT table dated 2026-09-16. That baseline is a **minimum floor**, not a permanent ceiling:

```text
hard baseline = 194
provider discovery today >= 194
provider adds language later
        ↓
SREADYA discovers it
        ↓
translate + validate
        ↓
publish automatically when complete
```

CI MUST fail if the provider-supported target set unexpectedly drops below the frozen 194-language baseline or if a frozen baseline language disappears. Future provider additions MAY raise the public language count without a code rewrite.

---

## 2. Non-negotiable product invariants

### 2.1 English is the only normal authoring language

User-visible product copy MUST be referenced by stable message/content IDs.

Bad:

```tsx
<h1>Your cycle, your context, your private space.</h1>
```

Required:

```tsx
<h1>{t('home.hero.title')}</h1>
```

Normal feature development MUST NOT require manual editing of hundreds of locale files.

### 2.2 Public support means complete support

A locale is publicly selectable only when all of the following are true:

```text
provider supports target
AND source catalogue is current
AND translated bundle exists
AND translated key count == source key count
AND placeholders match exactly
AND protected terminology is preserved
AND bundle QA passes
AND route-level smoke checks pass
```

A partial bundle MUST NOT be advertised as supported.

There is no public "English fallback" badge, no raw CLDR/ISO-code dumping, and no mixed-language page for a locale represented as fully translated.

### 2.3 Atomic language switching

The current language remains active until the complete target bundle has loaded and validated.

```text
English active
    ↓
user selects Tamil
    ↓
load complete Tamil bundle
    ├── fail → keep English
    └── pass → switch whole app atomically
```

A target locale is never persisted before successful activation.

### 2.4 Layout direction and text direction are separate

Selecting an RTL language MUST NOT mirror or reorder the SREADYA composition.

The product layout remains designer-controlled and stable. Text containers may use `dir="auto"` or locale-aware text direction so Arabic, Hebrew, Persian, Urdu, and other RTL scripts read correctly.

SREADYA still sets the correct document language for accessibility:

```html
<html lang="ar">
```

But the root document direction MUST NOT be used as a global layout switch.

### 2.5 Private health data never enters the translation pipeline

Automated translation may receive SREADYA-authored product copy such as navigation, labels, help text, public explanations, accessibility strings, and settings text.

It MUST NOT receive user health/private data, including:

- cycle history;
- symptom history;
- medication entries;
- fertility/reproductive observations;
- sexual-activity observations;
- private notes;
- journals;
- reports containing personal health information;
- vault data;
- recovery material;
- account secrets.

Any future user-content translation feature requires a separate explicit privacy design and consent boundary.

### 2.6 Translation providers are adapters

SREADYA owns the provider interface.

Initial production provider:

```text
GoogleCloudProvider → PRIMARY
```

Future optional adapters:

```text
AzureProvider
OtherProvider
HumanReviewProvider
```

Changing provider MUST NOT require page rewrites or message-ID changes.

---

## 3. Current Google NMT baseline: 194+

The repository contains a frozen provider baseline representing the **194 rows** in Google's Cloud Translation NMT support table as published on 2026-09-16.

Authoritative upstream references:

- https://docs.cloud.google.com/translate/docs/languages
- https://docs.cloud.google.com/translate/docs/list-supported-languages

Google documents that the supported-language list is updated when languages are added and can be queried through Cloud Translation Basic or Advanced APIs.

SREADYA therefore maintains two related sets:

```text
FROZEN_BASELINE
= exactly 194 logical NMT language rows
= regression floor

DISCOVERED_PROVIDER_SET
= live provider-supported targets
= baseline + future additions
```

Release rule:

```text
FROZEN_BASELINE ⊆ DISCOVERED_PROVIDER_SET
AND |FROZEN_BASELINE| == 194
```

Aliases accepted by Google for the same logical language are normalized by SREADYA and MUST NOT create fake duplicate language choices.

Examples include provider aliases such as:

- Simplified Chinese: `zh-CN` / `zh`;
- Filipino/Tagalog: `fil` / `tl`;
- Hebrew: `he` / legacy `iw`;
- Javanese: `jv` / legacy `jw`.

The chooser exposes one clean logical choice per configured SREADYA target, not raw provider aliases.

---

## 4. Permanent architecture

```text
                    ┌──────────────────────┐
                    │  ENGLISH SOURCE      │
                    │ stable message IDs   │
                    └──────────┬───────────┘
                               │
                       source/hash diff
                               │
                  ┌────────────▼────────────┐
                  │ Translation Orchestrator│
                  │ provider-neutral router │
                  └────────────┬────────────┘
                               │
                  ┌────────────▼────────────┐
                  │ Google Cloud Translation│
                  │      PRIMARY NMT        │
                  └────────────┬────────────┘
                               │
                    machine translation
                               │
                  ┌────────────▼────────────┐
                  │ Translation QA          │
                  │ completeness            │
                  │ placeholders            │
                  │ terminology             │
                  │ source hash             │
                  │ schema / injection      │
                  └────────────┬────────────┘
                               │
                     content-addressed
                        locale bundles
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
       Web/PWA              Android                iOS
          │
          ▼
   SREADYA language chooser
          │
          ▼
 only complete validated targets
```

No visitor-time translation dependency is required.

---

## 5. Canonical source contract

Authoritative source:

```text
shared/i18n/source/en.json
```

A normal source entry is:

```json
{
  "home.hero.title": "Your cycle, your context, your private space."
}
```

Rules:

1. message IDs are stable;
2. values are UTF-8 strings;
3. placeholders use the SREADYA message contract;
4. source changes produce a new content hash;
5. translations are derivatives, never canonical product source;
6. page code references IDs, not provider-specific resources.

Generated platform files remain derivatives.

---

## 6. Translation memory and incremental work

Translation is based on stable identity + source value/hash.

```text
source message unchanged
        ↓
reuse translated value

source message new/changed
        ↓
translate only changed value
        ↓
validate
        ↓
update locale artifact
```

The system MUST NOT retranslate the entire catalogue on every build.

This keeps cost and provider traffic proportional to content changes rather than total product size.

---

## 7. Protected placeholders and terminology

Placeholders MUST survive machine translation exactly.

Example:

```text
source:
Week {week}

protected provider input:
Week __SREADYA_VAR_0__

translated:
الأسبوع __SREADYA_VAR_0__

restored:
الأسبوع {week}
```

CI compares the source and target placeholder sets and rejects any mismatch.

SREADYA also owns a protected-term glossary/do-not-translate set for terms such as:

```text
SREADYA
CycleVault
FORGE
NC CORP
WebCrypto
IndexedDB
PIN
E2EE
PWA
```

Provider-native glossary support may be used, but SREADYA's validation remains authoritative.

---

## 8. Translation provider security

Translation credentials MUST exist only in protected CI/build infrastructure.

Allowed patterns include:

```text
GitHub Actions secret
        ↓
translation job
        ↓
Google Cloud Translation
```

and preferably, when configured:

```text
GitHub OIDC
        ↓
Google Workload Identity Federation
        ↓
short-lived credentials
        ↓
Google Cloud Translation
```

Forbidden:

- API key in client JavaScript;
- API key in committed files;
- API key in PWA assets;
- API key in Flutter resources;
- direct public-browser calls to paid translation APIs.

---

## 9. Build-time machine translation flow

```text
git push / source change
        │
        ▼
validate canonical English catalogue
        │
        ▼
fetch provider supported-language set
        │
        ▼
assert frozen 194-language baseline still exists
        │
        ▼
compare source hashes against translation memory
        │
        ├── unchanged → reuse
        │
        └── changed/new
                │
                ▼
        protect placeholders/terms
                │
                ▼
        Google Cloud Translation
                │
                ▼
        restore placeholders
                │
                ▼
        automated QA
                │
                ▼
        complete locale artifacts
                │
                ▼
        manifest generation
                │
                ▼
        Web/Flutter build
                │
                ▼
        release tests
                │
                ▼
        deploy
```

Translation is infrastructure, not a manual release chore.

---

## 10. Locale publication and chooser UX

The public chooser is generated from validated publication metadata, not from the entire CLDR language-code universe.

Hard rule:

```text
SELECTABLE(locale)
=
providerSupported(locale)
AND completeBundle(locale)
AND validBundle(locale)
```

The chooser retains the current SREADYA visual language while using one coherent panel:

```text
┌────────────────────────────────────┐
│ Choose your language             × │
│                                    │
│ Search languages                   │
│ ┌────────────────────────────────┐ │
│ │ Search by language name...     │ │
│ └────────────────────────────────┘ │
│                                    │
│ Suggested                          │
│ English  தமிழ்  हिन्दी  Suomi      │
│ Español  العربية  Deutsch Français │
│                                    │
│ All languages                      │
│ ────────────────────────────────   │
│ العربية                 Arabic    │
│ বাংলা                   Bengali   │
│ 中文                     Chinese   │
│ Deutsch                 German    │
│ हिन्दी                  Hindi     │
│ 日本語                  Japanese  │
│ தமிழ்                   Tamil     │
│ ...                                │
└────────────────────────────────────┘
```

Requirements:

- one panel;
- one scrollable language list;
- native name primary;
- English name secondary;
- searchable by native name, English name, and supported code;
- suggested languages remain compact chips;
- no raw-code-only rows;
- no "English fallback" pills;
- no duplicate provider aliases;
- keyboard/screen-reader accessible;
- selected locale clearly marked.

Country flags may be decorative/representative but MUST NOT be the primary identity of a language.

---

## 11. Web runtime contract

Runtime API:

```ts
t(messageId, params?)
locale()
setLocale(tag)
formatDate(...)
formatNumber(...)
formatUnit(...)
```

Runtime rules:

- explicit selection wins over browser preference;
- selection persists locally;
- target bundle loads before activation;
- target bundle must be complete;
- target bundle must match the current source version;
- a failed load keeps the previous complete locale active;
- `<html lang>` updates after successful activation;
- layout geometry is not mirrored merely because text is RTL;
- text direction is locale/content aware;
- no runtime provider credential exists;
- no user health record is sent for translation.

---

## 12. Translation-safe visual design

Machine translation changes string length and script characteristics.

SREADYA UI components MUST tolerate:

- long German strings;
- Finnish compounds;
- Arabic/Urdu/Persian/Hebrew RTL text;
- Chinese/Japanese/Korean compact scripts;
- Tamil/Indic scripts;
- diacritics and combining marks.

Design rules include:

- avoid fixed text heights;
- avoid assumptions about line count;
- permit safe wrapping;
- use `min-width: 0` where flex/grid children need it;
- avoid clipping translated labels;
- use responsive controls;
- preserve design geometry while allowing text reflow;
- use locale-aware line breaking where supported.

---

## 13. CI globalization law

CI MUST reject regressions in the language contract.

Required checks:

1. frozen Google NMT baseline has exactly 194 logical rows;
2. provider discovery contains every frozen baseline target;
3. future provider additions are accepted without code rewrites;
4. all product UI source strings use stable message IDs;
5. hard-coded user-facing English is rejected except documented allow-list cases;
6. every referenced key exists in English;
7. placeholders match exactly;
8. protected terms are preserved;
9. locale artifacts match the current source version;
10. public locales have 100% key coverage;
11. raw/unsupported locale codes do not enter the chooser;
12. no translation API credential is present in client/public code;
13. representative route smoke tests find no source-English leakage in a non-English locale;
14. language switching is atomic;
15. locale persistence works across route changes and reloads;
16. RTL text does not reverse the SREADYA layout;
17. PWA caching does not serve stale-language manifests.

Representative fast-gate locales SHOULD include:

```text
de   long words
fi   long compounds
ar   RTL
zh-CN CJK
ta   Tamil script
hi   Devanagari
```

A release/nightly gate SHOULD verify all published locales.

---

## 14. No public partial fallback

English remains the canonical recovery source internally, but SREADYA MUST NOT advertise an incomplete locale as fully supported.

Therefore:

```text
complete locale
        ↓
publicly selectable

partial/stale/corrupt locale
        ↓
not publicly selectable
```

If a previously published target becomes invalid, the release must fail rather than silently ship a mixed-language experience.

This supersedes the old public "English fallback" chooser behavior.

---

## 15. Current repository migration

The existing `fix/sreadya-complete-locales` branch is the implementation branch for this closure.

Useful work retained:

- atomic bundle-loading concept;
- complete-bundle publication rule;
- source catalogue;
- manifest generation;
- provider-neutral translation interface;
- locale persistence;
- hard-coded-copy verification foundation.

Work superseded:

- manually completing locale JSON files in chat;
- exposing the raw CLDR universe as the public chooser;
- showing public English-fallback badges;
- treating partial locale artifacts as usable product support;
- using root document RTL direction to mirror layout.

Implementation sequence:

```text
1. freeze this architecture v2
2. freeze Google NMT 194-language baseline
3. implement GoogleCloudProvider
4. implement live provider-language discovery
5. implement baseline-superset gate
6. implement placeholder/term protection
7. implement incremental translation memory
8. implement complete-bundle-only manifest
9. redesign language chooser as one coherent panel
10. remove raw CLDR/fallback public rows
11. separate RTL text direction from layout direction
12. strengthen hard-coded-copy gate
13. add representative route tests
14. add all-published-locale release gate
15. generate/validate provider-backed bundles
16. deploy only after all required gates pass
17. verify live GitHub Pages state
18. merge only after formal evidence is green
```

---

## 16. Large-scale future: up to 10,000,000 content items

UI messages and large editorial content use the same stable-ID philosophy but different storage strategies.

Today:

```text
UI source
→ machine translation
→ static locale bundles
→ GitHub Pages/PWA cache
```

At very large content scale:

```text
page shell
    │
stable content ID
    │
ContentResolver
    │
source content + translated variant store
    │
CDN/object store/database
```

SREADYA MUST NOT pre-generate:

```text
10,000,000 pages × 194+ locales
```

as billions of static HTML files.

Instead translations are cached by stable content identity and source hash. Storage and rendering infrastructure may evolve without changing the page-level language contract.

---

## 17. Flutter/mobile contract

The same canonical source and translation provenance apply to Android/iOS.

Near term:

- continue generating Flutter-compatible localization derivatives;
- keep account-free/local-first behavior unchanged;
- keep language selection independent of private-health storage;
- do not place provider credentials in the app.

Long term, hundreds of locales may use lazy/downloadable signed language packs to avoid unnecessary binary growth.

Web closure does not weaken or fork the mobile language contract.

---

## 18. Formal closure criteria

This globalization pass is formally closed only when all applicable conditions are proven:

```text
ARCHITECTURE
[ ] v2 authority committed

PROVIDER
[ ] frozen Google NMT baseline count == 194
[ ] live Google supported-language discovery implemented
[ ] live set contains frozen baseline
[ ] future additions accepted automatically

TRANSLATION
[ ] source catalogue complete
[ ] all published non-English bundles are provider-generated
[ ] all published bundles are 100% complete
[ ] placeholders preserved
[ ] protected terms preserved
[ ] source hashes current

RUNTIME
[ ] atomic locale switching
[ ] no mixed-language supported locale
[ ] no raw aa/aaa-style rows
[ ] no English-fallback badges
[ ] one coherent chooser panel
[ ] locale persists
[ ] RTL text works without layout mirroring

PRIVACY/SECURITY
[ ] no translation credential in client/public assets
[ ] no private health data enters translation provider path

FUTURE CONTRACT
[ ] hard-coded user-facing English gate active
[ ] new source IDs automatically enter translation workflow
[ ] unchanged text is not retranslated
[ ] provider additions can expand beyond 194 automatically

RELEASE
[ ] representative cross-script tests green
[ ] all published locale artifact checks green
[ ] production build green
[ ] live GitHub Pages smoke checks green
```

No claim of formal closure is permitted while a required gate remains unproven.

---

## 19. Technology replacement rule

Replaceable adapters:

```text
Google Cloud Translation
Azure Translator
Next.js
React
Flutter
GitHub Pages
GitHub Actions
PWA cache
database/object store
CDN
message runtime
```

SREADYA-owned contracts:

```text
stable message IDs
stable content IDs
English source ownership
194-language provider baseline floor
future provider-superset rule
complete-bundle publication rule
translation provenance
placeholder semantics
protected terminology
private-health translation boundary
provider interface
atomic runtime activation
CI globalization law
```

---

## 20. Developer workflow after closure

Normal feature work becomes:

```text
1. create/update page
2. reference stable message IDs
3. write English source once
4. commit
5. CI detects new/changed source
6. machine translation fills all eligible targets
7. QA validates
8. complete artifacts publish
9. user selects language
10. SREADYA switches coherently
```

No developer manually translates 194+ locale catalogues.

That is the permanent SREADYA globalization contract.
