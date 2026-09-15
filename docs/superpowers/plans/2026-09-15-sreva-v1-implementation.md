# Sreva Worldwide v1.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Sreva as a local-first iOS/Android women's cycle companion implementing the complete v1.0 capability matrix while keeping reproductive-health processing on-device.

**Architecture:** Feature-oriented Flutter application with platform adapters for native health, notifications and device security. The domain layer is deterministic and independently testable; persistence, encrypted backup, notifications, HealthKit/Health Connect and UI are adapters around it.

**Tech Stack:** Flutter 3.47.x, Dart 3.13.x, Riverpod, Drift/SQLite, secure storage, local authentication, local notifications, HealthKit/Health Connect adapters, local PDF/CSV, audited cryptography.

**Spec:** `docs/superpowers/specs/2026-09-15-sreva-master-design.md`

## Global Constraints

- Public product name is `Sreva`; internal dedication is `For Sree Kutty`.
- Minimum iOS target is 17.0; first physical target is iPhone 17.
- Core app must work without account, operator backend or network.
- No health values in ordinary logs, analytics, diagnostics or CI fixtures.
- Prediction Engine v1 follows the exact algorithm in the spec.
- V1 makes no disease-diagnosis, treatment or contraceptive-effectiveness claim.
- All local schema changes are transactional and versioned.
- Store signing keys and real health data are never committed.

---

### Task 1: Repository foundation and executable shell

**Files:** create Flutter project metadata, app shell, theme, routing, version registry and smoke tests.

**Interfaces:** produces `SrevaApp`, `AppVersions`, and top-level navigation consumed by all feature tasks.

- [ ] Write smoke tests for app title, primary navigation destinations and version registry.
- [ ] Run tests and verify they fail because app shell is absent.
- [ ] Implement app shell, theme tokens, navigation rail/bottom bar, and version registry.
- [ ] Run smoke tests and static analysis.
- [ ] Commit `feat: establish Sreva application shell`.

### Task 2: Cycle domain and Prediction Engine v1

**Files:** cycle entities, interval validation, prediction value objects, predictor, prediction tests.

**Interfaces:** `CyclePredictor.predict(List<DateTime> starts) -> CyclePrediction?`.

- [ ] Write tests for regular cycles, irregular cycles, invalid intervals, insufficient history, window/confidence, and deterministic versioning.
- [ ] Verify red.
- [ ] Implement the exact spec algorithm with no storage/UI dependency.
- [ ] Verify green and run full test suite.
- [ ] Commit `feat: add interpretable on-device cycle prediction`.

### Task 3: Health observation model and local repository contract

**Files:** period episodes, period days, observation types, life-stage mode, reminder records, repository interface, tests.

**Interfaces:** `HealthRepository` CRUD/stream API consumed by features and persistence adapter.

- [ ] Write domain invariant tests for period ordering, overlap resolution, observations and mode transitions.
- [ ] Verify red.
- [ ] Implement immutable domain models and repository contract.
- [ ] Verify green.
- [ ] Commit `feat: define Sreva health domain`.

### Task 4: Encrypted local persistence and migrations

**Files:** Drift schema, DB opener/key provider abstraction, migration coordinator, integrity validator, repository implementation, migration tests.

**Interfaces:** `LocalHealthRepository`, `VaultKeyProvider`, `MigrationCoordinator`.

- [ ] Write repository persistence and migration tests using synthetic records only.
- [ ] Verify red.
- [ ] Implement schema v1 and transactional migration framework.
- [ ] Implement secure-key adapter boundaries and no-backup database placement.
- [ ] Verify green and run integrity checks.
- [ ] Commit `feat: add encrypted local health vault`.

### Task 5: Period tracking, calendar and daily logging UI

**Files:** onboarding, home, period editor, calendar, daily log, symptom/reproductive observation screens and controllers.

**Interfaces:** UI writes only through application use cases over `HealthRepository`.

- [ ] Write controller/widget tests for add/edit/end/delete period and daily observations.
- [ ] Verify red.
- [ ] Implement the screens and use cases.
- [ ] Verify green including accessibility semantics.
- [ ] Commit `feat: add cycle calendar and daily logging`.

### Task 6: Reminder engine and iOS/Android notification adapters

**Files:** reminder policy/state machine, scheduler interface, iOS/Android adapter integration, Reminder Health screen, tests.

**Interfaces:** `ReminderPlanner`, `NotificationScheduler`.

- [ ] Write state-machine and date/time tests including DST/time-zone/prediction changes.
- [ ] Verify red.
- [ ] Implement reminder plans, privacy modes and rescheduling logic.
- [ ] Add platform notification adapters and permission diagnostics.
- [ ] Verify green.
- [ ] Commit `feat: add resilient local reminder engine`.

### Task 7: Insights and prediction history

**Files:** insight engine, prediction history, metrics evaluator, insight UI, tests.

**Interfaces:** `InsightEngine.summarize(...)`, `PredictionEvaluator.evaluate(...)`.

- [ ] Write tests for cycle averages, variation, symptom frequency, MAE/window coverage and non-causal wording.
- [ ] Verify red.
- [ ] Implement local computations and insight cards.
- [ ] Verify green.
- [ ] Commit `feat: add explainable local cycle insights`.

### Task 8: Life-stage modes and reproductive workflows

**Files:** TTC, pregnancy, postpartum, breastfeeding, perimenopause, menopause and hormonal-contraception presentation/application modules.

**Interfaces:** mode-specific capabilities gate UI; historical storage remains shared.

- [ ] Write mode capability tests.
- [ ] Verify red.
- [ ] Implement mode switcher and relevant logging surfaces.
- [ ] Verify green and no-history-deletion invariant.
- [ ] Commit `feat: add life-stage modes`.

### Task 9: HealthKit and Health Connect integration

**Files:** platform health gateway contract, Swift/Kotlin adapters, provenance/deduplication mapping, permission screens, tests.

**Interfaces:** `PlatformHealthGateway` read/write supported observations.

- [ ] Write mapper/deduplication/permission-state tests.
- [ ] Verify red.
- [ ] Implement iOS HealthKit adapter first, then Android Health Connect adapter.
- [ ] Verify green on available build environments and keep unsupported adapter disabled rather than faked.
- [ ] Commit `feat: add opt-in platform health integration`.

### Task 10: Local assistant and voice command workflow

**Files:** intent parser, command types, confirmation UI, voice adapter interface, tests.

**Interfaces:** `LocalIntentParser.parse(String, DateTime now) -> ParsedCommand`.

- [ ] Write tests for period start/end, flow, symptom, reminder and query phrases with ambiguity handling.
- [ ] Verify red.
- [ ] Implement deterministic local parser and confirmation flow.
- [ ] Add on-device speech adapter with explicit unsupported state.
- [ ] Verify green.
- [ ] Commit `feat: add private local assistant`.

### Task 11: Doctor reports, exports and partner sharing

**Files:** report model, PDF/CSV generators, share builder, QR/manual partner summary, tests.

**Interfaces:** `ReportBuilder`, `PartnerShareBuilder`.

- [ ] Write tests verifying category selection and private-category exclusion defaults.
- [ ] Verify red.
- [ ] Implement local report/export and user-controlled share surfaces.
- [ ] Verify green and ensure no implicit network transport.
- [ ] Commit `feat: add local reports and privacy-controlled sharing`.

### Task 12: CycleVault encrypted backup/restore

**Files:** versioned manifest, encrypt/decrypt service, restore validator, atomic replace coordinator, tests.

**Interfaces:** `CycleVaultService.export(...)`, `CycleVaultService.restore(...)`.

- [ ] Write round-trip, wrong-passphrase, tamper, old-format, and failed-restore-preserves-original tests.
- [ ] Verify red.
- [ ] Implement authenticated encrypted archives and recovery flow.
- [ ] Verify green.
- [ ] Commit `feat: add user-controlled encrypted backups`.

### Task 13: Privacy Center, app lock and safe diagnostics

**Files:** privacy settings, biometric gate, app-switcher privacy, delete/wipe flows, diagnostic report, tests.

**Interfaces:** `PrivacyController`, `DiagnosticReportBuilder`.

- [ ] Write tests asserting diagnostic allowlist and data deletion semantics.
- [ ] Verify red.
- [ ] Implement privacy center, three notification privacy modes, lock controls and safe diagnostics.
- [ ] Verify green.
- [ ] Commit `feat: add privacy center and diagnostic safety`.

### Task 14: Worldwide UX, accessibility and localization foundation

**Files:** localization resources, locale/date/unit formatters, RTL-safe layouts, semantic labels, appearance settings, tests.

**Interfaces:** all feature UI consumes locale formatters; no hardcoded display dates.

- [ ] Write localization/formatter/accessibility smoke tests.
- [ ] Verify red.
- [ ] Implement English baseline plus localization-ready ARB resources, 12/24h and metric/imperial settings.
- [ ] Verify green.
- [ ] Commit `feat: harden worldwide accessibility foundation`.

### Task 15: Security, CI/CD and release engineering

**Files:** GitHub Actions workflows, dependency policy, SBOM job, secret scanning config, release checklist, store metadata templates.

**Interfaces:** CI gates merges/releases; no signing secrets in repository.

- [ ] Add checks that intentionally fail on forbidden sample secrets and health-log patterns, then confirm expected failure.
- [ ] Implement CI/security policy and remove the intentionally bad fixtures.
- [ ] Validate workflow syntax and repository secret-free state.
- [ ] Commit `build: add Sreva production quality gates`.

### Task 16: Full-system acceptance

**Files:** integration/acceptance tests, capability matrix, release-readiness report.

**Interfaces:** worldwide v1.0 definition in master spec.

- [ ] Map every capability family to implementation and tests.
- [ ] Run format, static analysis, unit/widget/integration tests and native tests available in the current environment.
- [ ] Run privacy scans ensuring no health values in diagnostics/logging.
- [ ] Build unsigned iOS release artifact on macOS CI when repository is hosted; sign/TestFlight only with owner-provided Apple credentials.
- [ ] Build Android release artifact and run closed-track validation before Play production.
- [ ] Commit `release: complete Sreva v1 readiness`.
