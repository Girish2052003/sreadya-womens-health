# Sreva Mobile v1.0 Implementation Baseline

> **Status after 16 September 2026:** This is the Flutter/mobile implementation baseline and historical task plan. It is **not** the top-level Sreva implementation programme anymore. The authoritative architecture is `docs/superpowers/specs/2026-09-16-sreva-web-product-architecture-design.md`; the cross-platform implementation programme is `docs/superpowers/plans/2026-09-16-sreva-c2-cross-platform-implementation.md`. If this document conflicts with either, the newer C2 documents win.

> **For agentic workers:** REQUIRED SUB-SKILL for implementation: use `superpowers:subagent-driven-development` or `superpowers:executing-plans` task-by-task, with TDD and verification-before-completion.

**Original goal:** Build the Flutter mobile client as a local-first iOS/Android women's cycle companion implementing the mobile v1.0 capability matrix while keeping reproductive-health processing local.

**C2 interpretation:** This Flutter code is now one first-class implementation of the Sreva product contract. It MUST remain semantically aligned with the equal first-class Web/PWA client through shared schemas/specifications/test vectors. It MUST NOT become the sole product authority merely because it existed first.

**Mobile architecture:** Feature-oriented Flutter app with native platform adapters for health, notifications and device security. Domain logic is deterministic/testable; storage, backup, notifications, HealthKit/Health Connect and UI remain adapters around it.

**Mobile tech:** Flutter 3.47.2, Dart 3.13.2, Riverpod, Drift/SQLite/SQLCipher-class storage, secure storage, local authentication, local notifications, HealthKit/Health Connect adapters, local PDF/CSV, reviewed cryptography.

**Specs:**

- Cross-platform constitution: `docs/superpowers/specs/2026-09-16-sreva-web-product-architecture-design.md`
- Mobile baseline companion: `docs/superpowers/specs/2026-09-15-sreva-master-design.md`

## Global constraints after C2 amendment

- Public product name is `Sreva`; created in honour of `Sreedevi Girish Nallan Chakravathy`.
- Core health functionality MUST work without account, optional sync service, or network.
- Account mode MAY add E2EE multi-device continuity but MUST NOT add superior health features.
- No health values in ordinary logs, analytics, diagnostics, CI fixtures, URLs, or unencrypted sync payloads.
- Prediction Engine v1 follows the shared canonical algorithm/vectors.
- V1 makes no disease-diagnosis, treatment, or contraceptive-effectiveness claim.
- All local schema changes are transactional/fail-safe and versioned.
- Store signing keys, sync/recovery secrets, and real health data are never committed.
- Android, iOS, and Web/PWA are equal first-class clients. Platform adapters may differ; health semantics may not.
- This plan does not authorize production E2EE sync cryptography. Sync is implemented only under the newer cross-platform plan after protocol review and interoperability vectors.

---

### Task 1: Repository foundation and executable mobile shell

**Existing/target files:** Flutter metadata, `lib/app/`, theme, routing, version registry, smoke tests.

**Interfaces:** `SrevaApp`, `AppVersions`, top-level mobile navigation.

- [x] Establish Flutter application shell, theme/navigation/version registry in the current repository baseline.
- [x] Preserve smoke/static-analysis coverage.
- [ ] Future C2 work: map mobile design tokens/navigation semantics to `shared/` contract without rewriting verified mobile UI unnecessarily.

### Task 2: Cycle domain and Prediction Engine v1

**Existing files:** `lib/features/cycle/domain/`, `lib/features/predictions/domain/`, tests under `test/domain/` and `test/predictions/`.

- [x] Implement deterministic local cycle prediction and core invariants.
- [x] Test regular/irregular/invalid/insufficient-history/window/confidence behavior.
- [ ] Future C2 work: run the same shared JSON golden vectors against Dart and TypeScript engines.

### Task 3: Health observation model and local repository contract

**Existing files:** `lib/features/cycle/domain/cycle_models.dart`, repository contracts/implementations.

- [x] Define period/observation/life-stage/reminder records and repository operations.
- [ ] Future C2 work: map these semantics to versioned language-neutral schemas under `shared/schemas/`.

### Task 4: Encrypted local persistence and migrations

**Existing files:** `lib/core/database/health_vault.dart`, `lib/core/database/local_health_repository.dart`, `lib/core/database/migration_coordinator.dart`, `lib/core/crypto/`.

- [x] Implement mobile encrypted local persistence and migration framework.
- [x] Keep device-key adapter boundary and migration validation.
- [ ] Future C2 work: do not replace mobile storage with Web storage; Web gets its own encrypted browser-vault adapter conforming to the same domain contract.

### Task 5: Period tracking, calendar and daily logging UI

**Existing modules:** onboarding, home, cycle, calendar, logging and related controllers/screens.

- [x] Implement mobile add/edit/end/delete period and health observation workflows.
- [ ] Future C2 work: map each behavior to atomic capability IDs and Web parity tests.

### Task 6: Reminder engine and native notification adapters

**Existing modules:** `lib/features/reminders/`, `platform_templates/android/`, `platform_templates/ios/`.

- [x] Implement shared mobile reminder policy/state and native scheduling adapters.
- [x] Cover DST/timezone/prediction-change behavior and Reminder Health.
- [ ] Future C2 work: preserve reminder policy as canonical intent while Web/PWA provides an honest browser-adapted delivery mechanism.

### Task 7: Insights and prediction history

**Existing modules:** `lib/features/insights/`, prediction history/evaluator tests.

- [x] Implement local observational insights and prediction history/evaluation.
- [ ] Future C2 work: share vectorized semantics/wording boundaries with Web.

### Task 8: Life-stage modes and reproductive workflows

**Existing modules:** `lib/features/life_stage/`, logging/reproductive domain records.

- [x] Implement cycle tracking, TTC, pregnancy, postpartum, breastfeeding, perimenopause, menopause transition, hormonal-contraception contexts.
- [x] Preserve history across mode changes.
- [ ] Future C2 work: capability/schema parity with Web.

### Task 9: HealthKit and Health Connect integration

**Existing modules:** `lib/features/health_integration/`, Swift/Kotlin templates.

- [x] Implement platform-gateway/provenance/deduplication boundaries.
- [x] Keep unsupported native adapters disabled rather than faked.
- [ ] C2 rule: Web/PWA does not fake direct HealthKit/Health Connect access; it may display authorized records synchronized through the E2EE layer once implemented.

### Task 10: Local assistant and voice workflow

**Existing modules:** `lib/features/assistant/`.

- [x] Implement deterministic local intent parser/confirmation workflow.
- [x] Preserve explicit unsupported state for unavailable offline voice.
- [ ] Future C2 work: shared intent fixtures and equivalent TypeScript parser behavior.

### Task 11: Doctor reports, exports and partner sharing

**Existing modules:** `lib/features/reports/`, `lib/features/partner/`.

- [x] Implement local report/export and privacy-controlled manual sharing baseline.
- [ ] Future C2 work: Web report parity and optional live partner transport only after E2EE protocol approval.

### Task 12: CycleVault encrypted backup/restore

**Existing file:** `lib/features/backup/data/cycle_vault_service.dart` and tests.

- [x] Implement versioned authenticated archive, wrong-passphrase/tamper handling, and fail-safe restore.
- [ ] Future C2 work: create cross-platform CycleVault golden vectors before claiming Web/mobile interoperability. Existing mobile format is not silently changed.

### Task 13: Privacy Center, app lock and safe diagnostics

**Existing modules:** `lib/features/privacy/`, `lib/core/diagnostics/`, `lib/features/diagnostics/`.

- [x] Implement privacy center, lock controls, notification privacy and sanitized diagnostics.
- [ ] Future C2 work: add account/sync/device/recovery status without weakening local-only/no-account privacy mode.

### Task 14: Worldwide UX, accessibility and localization foundation

**Existing files:** `lib/l10n/`, `lib/core/settings/`, Settings UI/tests.

- [x] Establish localization-ready mobile resources and formatters.
- [ ] Future C2 work: shared terminology/design token rules and Web WCAG 2.2 AA conformance.

### Task 15: Security, CI/CD and release engineering

**Existing files:** `.github/workflows/`, security/privacy scans, SBOM/signature tooling and release docs.

- [x] Preserve current public-repository hardening, mobile build verification, dependency scanning and release signing boundaries.
- [ ] Future C2 work: add Web/shared/backend CI jobs; do not weaken existing Android/iOS gates.

### Task 16: Mobile full-system acceptance

**Existing closure:** current `tool/verify_v1_traceability.py` traces 22 broad mobile v1 families to code/evidence; current CI verifies Android production/family-preview paths and iOS no-codesign compilation.

- [x] Retain this as mobile-baseline evidence.
- [ ] Do not call it sufficient C2 closure. Cross-platform C2 closure requires the 258-ID registry and Android/iOS/Web/PWA applicability/conformance evidence from the new implementation programme.

---

## C2 handoff

This mobile plan ends where the new cross-platform plan begins. No existing mobile module should be rewritten solely to make the repository look symmetrical. The C2 programme first creates language-neutral contracts and uses them to prove/repair parity incrementally.

The next implementation authority is:

`docs/superpowers/plans/2026-09-16-sreva-c2-cross-platform-implementation.md`
