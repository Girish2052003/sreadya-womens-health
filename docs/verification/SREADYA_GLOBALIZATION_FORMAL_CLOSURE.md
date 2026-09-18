# SREADYA Globalization Formal Closure Ledger

**Authority:** `docs/architecture/SREADYA_GLOBALIZATION_ARCHITECTURE.md`  
**Implementation branch:** `fix/sreadya-complete-locales`  
**Pull request:** #25  
**Status:** **OPEN — provider execution not yet proven**  
**Rule:** This ledger must not say PASS until the exact final PR head satisfies every required gate.

## Frozen contract

- English is the canonical authored source.
- The Google Cloud NMT regression floor is exactly **194 logical language rows**.
- The live provider-supported set must be a superset of that frozen floor.
- Future provider additions are eligible automatically.
- Public selection is complete-bundle only.
- Partial/fallback-only locale rows are not public.
- Locale activation is atomic.
- RTL text does not mirror the authored SREADYA layout.
- Translation credentials remain outside clients/public assets.
- Private health/user records never enter the translation provider path.
- Machine-generated full-app bundles are recorded as `machine-unreviewed` and `mixed` risk; no human-review claim is implied.

## Current implementation evidence

The branch contains:

- `shared/i18n/providers/google-nmt-baseline.json` — frozen 194-row Google NMT floor.
- `tool/i18n_pipeline.py` — provider discovery, Google NMT translation, protected placeholders/terms, per-message source hashes, incremental reuse, duplicate-input elimination, complete-bundle generation, and fail-closed per-run character budget.
- `tool/verify_globalization.py` — architecture/provider/client/formal-closure verifier.
- `.github/workflows/i18n-google-sync.yml` — protected provider orchestration with a no-charge discovery/estimate stage before the paid translation ceiling is required.
- `web/src/i18n/I18nProvider.tsx` — atomic complete-bundle activation.
- `web/src/components/navigation/LanguageChooser.tsx` — one searchable published-locale chooser.
- `web/src/app/globalization.css` — stable layout with locale-aware RTL text.
- `web/public/sw.js` — network-first mutable language manifest plus content-addressed immutable locale bundle caching.
- `web/e2e/globalization-closure.spec.ts` — all-published-locale artifact proof and representative cross-script route rendering.
- `web/eslint.config.mjs` — future-page hard-coded user-copy gate.
- `verification/reference/test_globalization_provider_contract.py` — provider floor, alias/future-language, placeholder, batching, spend-ceiling, and client-credential regression tests.

## Provider execution gate

The provider stage intentionally fails closed when `SREADYA_GOOGLE_TRANSLATE_API_KEY` is absent.

Once the protected credential is available, the workflow must:

1. query Google's current supported-language set;
2. prove every frozen baseline target still exists;
3. print the exact provider-input character plan without translating product text;
4. require the explicitly approved `SREADYA_TRANSLATION_MAX_CHARACTERS` repository variable;
5. refuse the paid translation phase if the plan exceeds that ceiling;
6. translate only new/changed unique source values;
7. generate complete target artifacts;
8. verify source hashes, placeholders, protected terminology, provider identity, coverage, and publication rules;
9. commit generated artifacts back to the implementation branch;
10. trigger the full repository gates again on the resulting exact head.

## Formal PASS conditions

The closure may be changed to PASS only when all of the following are evidenced on one exact final head:

- [ ] Google provider discovery snapshot exists.
- [ ] Discovered logical language count is at least 194.
- [ ] Frozen 194-row baseline is a subset of discovery.
- [ ] English plus every discovered non-English target has a current complete published artifact.
- [ ] Every published non-English artifact identifies `google-cloud-translation` as provider.
- [ ] Every published bundle has exact source-key and placeholder parity.
- [ ] All generated source hashes match the current canonical English catalogue.
- [ ] No public raw/fallback language rows exist.
- [ ] Representative Arabic/German/Finnish/Hindi/Tamil/Chinese route tests pass.
- [ ] RTL text proof passes with document layout direction kept stable.
- [ ] PWA language manifest/bundle cache proof passes.
- [ ] Web lint, strict TypeScript, unit tests, static export, browser E2E, privacy, secret scan, and security gates pass.
- [ ] C2 Task 15 globalization/accessibility gate passes.
- [ ] All required repository workflows for the exact head are green.
- [ ] PR is still based on current `main` with no unresolved divergence.
- [ ] Post-merge `main` and live GitHub Pages are re-verified.

Until those boxes are supported by evidence, the implementation is a **formal-closure candidate**, not a completed closure.
