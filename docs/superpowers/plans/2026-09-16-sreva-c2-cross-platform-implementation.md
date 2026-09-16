# Sreva C2 Cross-Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to execute this plan task-by-task. Use `superpowers:test-driven-development` for implementation changes and `superpowers:verification-before-completion` before claiming a task/phase complete.

**Goal:** Extend the already-verified Flutter Android/iOS Sreva baseline into the approved C2 product: one Sreva with three equal first-class clients (Android, iOS, Web/PWA), language-neutral shared contracts, encrypted local Web storage, offline PWA operation, and optional E2EE continuity—without weakening or rewriting the existing mobile product.

**Architecture:** Preserve `lib/` + `platform_templates/` as the Flutter/mobile client. Add `web/` for a browser-native Next.js/React/TypeScript client. Add `shared/` for the 258-ID capability registry, canonical schemas, terminology, design tokens, prediction/reminder/CycleVault/sync vectors, and cross-platform conformance fixtures. Add `sync_service/` only after the E2EE protocol security gate. Core health functionality remains local/no-account/offline; account mode adds encrypted continuity only.

**Tech Stack:**

- Existing mobile: Flutter 3.47.2, Dart 3.13.2, Riverpod 3.4.3, go_router 18.0.1, Drift 2.35.0, sqlite3/SQLCipher source 3.6.0, cryptography 2.9.0, flutter_secure_storage 11.1.1, local_auth 3.0.2.
- Web baseline pinned for scaffold: Node.js **24.21.0 LTS**, Next.js **16.3.3 Active LTS**, React/React DOM **19.3.x**, TypeScript **6.0.3**, ESLint **10.10.0**.
- Web storage/schema/reporting: Dexie **4.4.6**, Ajv **8.20.0**, `@noble/hashes` **2.4.0** only for the existing CycleVault Argon2id interoperability task after vector/performance review, pdf-lib **1.17.1**.
- Web tests: Vitest **5.0.0**, React Testing Library **16.3.3**, Playwright **1.63.0**, axe-core / `@axe-core/playwright` **4.13.0**.
- Optional sync-service target after protocol gate: Go **1.27.1**, `github.com/go-chi/chi/v5` **v5.3.2**, `github.com/jackc/pgx/v5` **v5.11.0**, `github.com/go-webauthn/webauthn` **v0.17.4**, PostgreSQL **18.6**. No ORM and no Redis unless measurements later justify them.
- Package manager for Web: npm with committed `web/package-lock.json`; exact transitive versions come from the lockfile.

**Spec:** `docs/superpowers/specs/2026-09-16-sreva-web-product-architecture-design.md`

**Consistency audit:** `docs/superpowers/specs/2026-09-16-sreva-c2-consistency-audit.md`

## Global Constraints

- Do not rewrite working Flutter features merely to make Web implementation symmetrical.
- Do not weaken Android/iOS behavior to match a browser limitation.
- Do not give Web a different prediction/reminder/insight meaning to make implementation easier.
- No sensitive health value in logs, analytics, URLs, service-worker caches, CI fixtures, browser telemetry, or server plaintext.
- Account-free remains a complete first-class health experience.
- Optional account/sync is never required for cycle tracking, predictions, insights, reports, reminders, or local backup.
- No production sync cryptography until **Task 19 — E2EE protocol design gate** is explicitly passed.
- No real SMS/email provider secret or production provider account is required for local/Web phases. Identity adapters remain test/local until the provider/deployment gate.
- Current Android package/signing/release pipelines remain intact.
- Current iOS no-codesign verification remains intact.
- Current mobile CycleVault format is not changed without compatible golden vectors and migration/recovery tests.
- Every new capability implementation references the approved capability IDs.

---

## Phase A — Freeze machine-readable shared contracts before Web feature code

### Task 1: Add the 258-ID machine-readable capability registry

**Files:**
- Create: `shared/capabilities/sreva-capabilities.v1.json`
- Create: `shared/capabilities/README.md`
- Create: `verification/reference/test_cross_platform_capability_registry.py`
- Later modify: `tool/verify_v1_traceability.py` only after the new registry test is green.

**Step 1 — Write failing registry-shape test**

Test requirements:
- exactly 18 launch families;
- exactly 258 launch requirement IDs;
- prefixes/counts exactly match the approved spec;
- IDs unique;
- each record contains `id`, `name`, `family`, `launch_status`, `platforms`, `offline`, `sync`, `privacy_class`, `tests_required`, `marketing_eligible`;
- future `FUT-*` entries are excluded from the 258 launch count.

Run:

```bash
python -m pytest -q verification/reference/test_cross_platform_capability_registry.py
```

Expected: FAIL because registry does not exist.

**Step 2 — Create registry and README**

Use the exact capability IDs/names from Section 1 of the C2 spec. `platforms` explicitly records `android`, `ios`, `web`, and `pwa` as `full`, `adapted`, or `na`; never infer platform status from missing fields.

**Step 3 — Re-run test**

Expected: PASS with output proving 18 families / 258 launch IDs.

**Step 4 — Extend traceability without deleting mobile closure**

Modify `tool/verify_v1_traceability.py` so the old 22 mobile-family checks continue to run, then additionally load the 258-ID registry and validate structure/links. Do not yet require every Web implementation path because Web does not exist; use explicit lifecycle states (`contract`, `implemented`, `verified`) instead of fake green cells.

**Step 5 — Run old + new verification**

```bash
python tool/verify_v1_traceability.py
python -m pytest -q verification/reference
```

Commit: `contracts: add 258-id Sreva capability registry`

---

### Task 2: Canonical domain schemas and terminology

**Files:**
- Create: `shared/schemas/v1/period-episode.schema.json`
- Create: `shared/schemas/v1/health-observation.schema.json`
- Create: `shared/schemas/v1/prediction.schema.json`
- Create: `shared/schemas/v1/reminder-preference.schema.json`
- Create: `shared/schemas/v1/life-stage.schema.json`
- Create: `shared/schemas/v1/report-selection.schema.json`
- Create: `shared/schemas/v1/device-record.schema.json`
- Create: `shared/schemas/v1/sync-envelope.schema.json`
- Create: `shared/terminology/en.v1.json`
- Create: `verification/reference/test_shared_schemas.py`

**Step 1 — Write failing schema validation tests**

Use representative synthetic fixtures only. Validate required fields, enum values, date/time encoding rules, source/provenance fields, and no free-form health payload in sync metadata schema.

**Step 2 — Implement JSON Schema 2020-12 documents**

Mirror existing Dart semantics from:
- `lib/features/cycle/domain/cycle_models.dart`
- `lib/features/life_stage/domain/life_stage.dart`
- `lib/features/reminders/domain/reminder_models.dart`
- prediction-history models.

Canonical timestamps transported between clients are UTC RFC3339 strings; user timezone/locale is a separate field where semantics require it.

**Step 3 — Add terminology file**

Include stable English canonical labels/definitions for period episode, flow, observation kinds, life stages, prediction confidence, reminder privacy, account-free/account mode, encrypted sync, trusted device, recovery key.

**Step 4 — Run tests**

```bash
python -m pytest -q verification/reference/test_shared_schemas.py
```

Commit: `contracts: define canonical Sreva schemas and terminology`

---

### Task 3: Shared prediction and reminder conformance vectors

**Files:**
- Create: `shared/prediction/specification/prediction-v1.md`
- Create: `shared/prediction/test-vectors/prediction-v1.json`
- Create: `shared/reminders/reminder-policy-v1.md`
- Create: `shared/reminders/test-vectors/reminder-v1.json`
- Create: `test/conformance/shared_prediction_vectors_test.dart`
- Create: `test/conformance/shared_reminder_vectors_test.dart`
- Create: `verification/reference/test_shared_vector_shape.py`

**Step 1 — Write failing Dart vector-loader tests**

Read repository-relative JSON fixtures and compare current Dart Prediction Engine/Reminder Policy results.

**Step 2 — Populate vectors from already-tested mobile semantics**

Prediction vectors: regular, irregular, insufficient, invalid 15/90-day boundaries, outlier exclusion, corrected/deleted periods, leap year, timezone-safe dates, confidence boundaries.

Reminder vectors: 7/3/1-day, expected-day, late, DST, timezone, quiet hours, prediction change.

**Step 3 — Run Dart + Python tests**

```bash
flutter test test/conformance/shared_prediction_vectors_test.dart
flutter test test/conformance/shared_reminder_vectors_test.dart
python -m pytest -q verification/reference/test_shared_vector_shape.py
```

Expected: existing Dart behavior is now frozen as language-neutral vectors.

Commit: `contracts: freeze prediction and reminder conformance vectors`

---

### Task 4: Shared design tokens and privacy/regulatory rules

**Files:**
- Create: `shared/design-tokens/tokens.v1.json`
- Create: `shared/privacy/privacy-laws.v1.json`
- Create: `shared/regulatory/product-boundary.v1.json`
- Create: `verification/reference/test_shared_policy_contracts.py`

**Step 1 — Test required semantic tokens/rules**

Require brand/semantic colors by symbolic name, spacing/radius/motion token names, and privacy/regulatory rule IDs. Tests must not freeze inaccessible raw colours before visual contrast review.

**Step 2 — Add contract documents**

Privacy laws include no-account equality, local prediction/insights, no health telemetry, ciphertext-only optional sync, recovery boundary, explicit partner/health permissions. Regulatory boundary encodes forbidden affirmative diagnostic/contraception claims.

**Step 3 — Run policy tests**

Commit: `contracts: add shared design and privacy policy contracts`

---

## Phase B — Scaffold the browser-native Web/PWA without touching Flutter behavior

### Task 5: Create the pinned Next.js Web workspace

**Files:**
- Create: `web/package.json`
- Create: `web/package-lock.json`
- Create: `web/tsconfig.json`
- Create: `web/next.config.ts`
- Create: `web/eslint.config.mjs`
- Create: `web/vitest.config.ts`
- Create: `web/playwright.config.ts`
- Create: `web/src/app/layout.tsx`
- Create: `web/src/app/page.tsx`
- Create: `web/src/app/globals.css`
- Create: `web/src/test/setup.ts`
- Create: `web/src/test/smoke.test.tsx`
- Create: `web/.gitignore`
- Create: `.nvmrc` with `24.21.0` or document the repository-wide Node pin if an existing root runtime file is preferred.

**Step 1 — Write failing smoke test before real UI**

Test that the root page renders “Sreva” and an “Open Sreva” action.

**Step 2 — Initialize package with exact direct versions**

Runtime: `next@16.3.3`, `react@19.3`, `react-dom@19.3`, `dexie@4.4.6`, `ajv@8.20.0`, `pdf-lib@1.17.1`. Do not add analytics, ad, session-replay, cloud-AI, or remote logging packages.

Dev: `typescript@6.0.3`, `eslint@10.10.0`, `vitest@5.0.0`, `@testing-library/react@16.3.3`, `@playwright/test@1.63.0`, `axe-core@4.13.0`, `@axe-core/playwright@4.13.0` plus the matching React/Node type packages resolved and locked by npm.

**Step 3 — Configure static export**

`next.config.ts`: `output: 'export'`, TypeScript errors are fatal, image handling compatible with static export, no server-only features in the static client. Base-path handling must work for GitHub Pages project-path deployment and later custom-domain deployment.

**Step 4 — Run gates**

```bash
cd web
npm ci
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

Commit: `web: scaffold pinned Next.js C2 client`

---

### Task 6: Implement Web design system and route shells

**Files:**
- Create: `web/src/styles/tokens.ts`
- Create: `web/src/components/ui/Button.tsx`
- Create: `web/src/components/ui/Card.tsx`
- Create: `web/src/components/ui/StatusChip.tsx`
- Create: `web/src/components/navigation/PublicHeader.tsx`
- Create: `web/src/components/navigation/WorkspaceNav.tsx`
- Create public route pages under `web/src/app/(public)/...`
- Create private route shells under `web/src/app/app/...`
- Create: `web/src/test/design-system.test.tsx`
- Create: `web/e2e/navigation.spec.ts`

Public routes: Features, How it works, Cycle Tracking, Predictions, Reminders, Insights, Life Stages, Doctor Reports, Privacy, Security, Sync, Accessibility, Download, iPhone/Android/PWA install, Help, About, Release Notes, Privacy Policy, Terms, Security Report.

Private route shells: Home, Today, Calendar, Log, Cycle, Predictions, Reminders, Symptoms, Wellness, Medication, Reproductive Health, Life Stage, Insights, Reports, Assistant, Sharing, Vault, Sync, Devices, Privacy, Account, Recovery, Settings.

**TDD steps:** accessibility/name tests first; implement minimal route shells; run Vitest; run Playwright back/forward/deep-link checks; run axe smoke scan.

Commit: `web: add Sreva design system and route architecture`

---

### Task 7: PWA manifest, offline shell, install guidance

**Files:**
- Create: `web/public/manifest.webmanifest`
- Create: `web/public/sw.js`
- Create: `web/src/pwa/register-service-worker.ts`
- Create: `web/src/pwa/install-capability.ts`
- Create: `web/src/components/pwa/InstallGuide.tsx`
- Create: `web/e2e/pwa.spec.ts`
- Use existing approved Sreva logo/icon assets; do not invent new brand artwork in this task.

**Step 1 — Tests first**

Assert manifest identity, standalone display, service worker does not cache `/app` health payload responses, offline public/app shell availability, and iPhone/Android install-guidance rendering.

**Step 2 — Implement app-shell-only cache policy**

Cache immutable/static shell assets only. Never blanket-cache authenticated/API traffic.

**Step 3 — Build/test**

```bash
cd web
npm run build
npx playwright test e2e/pwa.spec.ts
```

Commit: `web: add privacy-safe PWA shell and install flow`

---

## Phase C — Encrypted account-free Web vault first

### Task 8: Browser vault data model and ciphertext-only IndexedDB

**Files:**
- Create: `web/src/vault/db.ts`
- Create: `web/src/vault/vault-types.ts`
- Create: `web/src/crypto/webcrypto.ts`
- Create: `web/src/vault/vault-service.ts`
- Create: `web/src/vault/vault-lock.ts`
- Create: `web/src/vault/vault-service.test.ts`
- Create: `web/e2e/vault-persistence.spec.ts`

**Security choice for local record encryption:** native WebCrypto AES-256-GCM with random 96-bit nonce per sealed record/envelope; versioned envelope includes algorithm/version/AAD metadata. The persistent health record body is ciphertext. Do not place raw health values in IndexedDB index keys.

**Step 1 — Write failing tests**

- persisted object does not contain known plaintext sentinel;
- tampered ciphertext fails closed;
- wrong key fails closed;
- lock removes decrypted application state;
- reopen can read using authorized stored key path;
- site-data-loss warning is visible for local-only mode.

**Step 2 — Implement minimum vault service**

Use non-extractable `CryptoKey` where browser persistence supports structured-clone semantics. Treat this as browser protection, not equivalent to secure hardware. Any additional PIN/passkey wrapping is a later tested layer, not a reason to store plaintext now.

**Step 3 — Run tests across Chromium + WebKit**

Commit: `web: add encrypted local browser health vault`

---

### Task 9: Web repository/domain adapters for period and observations

**Files:**
- Create: `web/src/domain/cycle/types.ts`
- Create: `web/src/domain/cycle/repository.ts`
- Create: `web/src/domain/cycle/invariants.ts`
- Create: `web/src/vault/health-repository.ts`
- Create: `web/src/domain/cycle/invariants.test.ts`
- Create: `web/src/vault/health-repository.test.ts`

**Step 1 — Tests first from shared schemas**

Validate period start/end, non-overlap behavior, observation kinds, record provenance, delete/update semantics.

**Step 2 — Implement local repository over encrypted vault**

The domain layer never imports React or browser UI APIs; persistence adapter never owns prediction semantics.

**Step 3 — Conformance**

Validate serialized synthetic records against `shared/schemas/v1/*` using Ajv.

Commit: `web: implement canonical cycle repository over encrypted vault`

---

### Task 10: Account-free onboarding, Home, Today, Log, Calendar, Cycle

**Files:**
- Implement corresponding pages/components under `web/src/app/app/` and `web/src/features/{onboarding,home,logging,calendar,cycle}/`.
- Create unit/component tests per feature.
- Create: `web/e2e/account-free-core.spec.ts`

**Required capabilities in this phase:** `CYC-*`, foundational `LOG-*`, `PRIV-004/005`, `WEB-001/004/005/010/012`.

**TDD sequence:**
1. Failing test: Continue privately creates no account/network request.
2. Implement local vault onboarding.
3. Failing test: start/end/backdate/edit/delete period.
4. Implement cycle actions.
5. Failing test: all approved observation kinds can be logged/edited/deleted.
6. Implement Today/Log.
7. Failing test: month/timeline/year calendar behavior.
8. Implement Calendar/Cycle.
9. Playwright offline flow: install/open → airplane/offline → log period → refresh → data still present locally.

Commit: `web: deliver account-free cycle logging and calendar core`

---

## Phase D — Reproduce the shared health intelligence, not a Web-specific variant

### Task 11: TypeScript Prediction Engine v1 against shared golden vectors

**Files:**
- Create: `web/src/domain/prediction/predictor.ts`
- Create: `web/src/domain/prediction/types.ts`
- Create: `web/src/domain/prediction/prediction-history.ts`
- Create: `web/src/domain/prediction/predictor.conformance.test.ts`
- Implement: `web/src/app/app/predictions/page.tsx`

**Step 1 — Failing conformance test loads `shared/prediction/test-vectors/prediction-v1.json`.**

**Step 2 — Implement exact algorithm semantics; do not tune Web independently.**

**Step 3 — Run Dart + TypeScript vectors and compare expected results.**

**Step 4 — UI shows likely date, range, confidence, source history explanation, no fake precision.**

Commit: `web: implement prediction-v1 shared conformance`

---

### Task 12: TypeScript reminder policy + adaptive Web Reminder Health

**Files:**
- Create: `web/src/domain/reminders/reminder-policy.ts`
- Create: `web/src/domain/reminders/reminder-policy.conformance.test.ts`
- Create: `web/src/pwa/notification-capability.ts`
- Create: `web/src/pwa/web-push-client.ts` (interface/no production relay until backend phase)
- Implement: `web/src/app/app/reminders/page.tsx`
- Create: `web/e2e/reminder-health.spec.ts`

**Steps:** vector-first policy; capability detection; Maximum Privacy local/in-app mode; honest closed-app limitation copy; optional push interface remains disabled unless a reviewed relay is configured; Reminder Health shows mechanism/permission/timezone/next reminder.

Commit: `web: implement adaptive reminder policy and health status`

---

### Task 13: Insights, life stages, reports, assistant, sharing, privacy center

**Files:**
- Create/implement modules under `web/src/features/{insights,life-stage,reports,assistant,sharing,privacy}/`.
- Implement corresponding private pages.
- Create tests mirroring current mobile behavior and capability IDs.

**Subtasks:**
1. Insights: observational language only, provenance/date range.
2. Life stage: all eight modes, switching never deletes history.
3. Reports: local CSV + pdf-lib PDF, category/date selection, preview before download/share.
4. Assistant: deterministic local text intent parser based on shared fixtures; no cloud LLM.
5. Partner baseline: local generated summary/QR/share; granular categories; revoke local grants.
6. Privacy Center: actual local status, sync shown as unavailable/off until Phase F, no false green claims.

Commit: `web: complete local-first Sreva intelligence and privacy features`

---

### Task 14: CycleVault Web/mobile interoperability

**Files:**
- Create: `shared/crypto/cyclevault-v1.md`
- Create: `shared/crypto/interoperability-vectors/cyclevault-v1.json`
- Create: `test/conformance/cyclevault_vectors_test.dart`
- Create: `web/src/crypto/cyclevault.ts`
- Create: `web/src/crypto/cyclevault.conformance.test.ts`
- Implement: `web/src/app/app/vault/page.tsx`

**Existing mobile format to preserve:** `SREVA-CYCLEVAULT` v1, Argon2id m=19 MiB/t=2/p=1, 32-byte key, AES-256-GCM, manifest as AAD.

**Web dependency gate:** `@noble/hashes@2.4.0` Argon2id may be used only after the exact mobile vectors pass in target browsers and latency/memory is acceptable. If not, STOP this task and perform a dedicated crypto-library review; do not silently change the backup format.

**Tests first:** mobile-generated synthetic vector decrypts on Web; Web-generated vector decrypts in Dart; tamper/wrong passphrase/schema failure; failed restore preserves live vault.

Commit: `crypto: prove CycleVault Web-mobile interoperability`

---

## Phase E — Accessibility, internationalization, diagnostics, and Web release pipeline

### Task 15: Accessibility and internationalization closure for local Web/PWA

**Files:**
- Create: `web/src/i18n/locale.ts`
- Create: `web/src/i18n/messages/en.json`
- Create: `web/src/accessibility/preferences.ts`
- Add component/E2E accessibility tests.

**Tests:** keyboard-only, focus visibility, 200% zoom, large text, reduced motion, high contrast, RTL fixture, long strings, locale dates, 12/24-hour, unit formatting, accessible chart summaries. Run `@axe-core/playwright` with WCAG 2.2 AA-targeted review; automated axe is necessary but not sufficient.

Commit: `web: close accessibility and localization foundation`

---

### Task 16: Privacy-preserving Web diagnostics and error recovery

**Files:**
- Create: `web/src/diagnostics/diagnostic-report.ts`
- Create: `web/src/diagnostics/diagnostic-report.test.ts`
- Create: `web/src/recovery/safe-mode.ts`
- Create: `web/src/components/errors/SafeMode.tsx`
- Create tests for corrupt vault/failed migration/storage pressure.

Diagnostics allow only version/browser/schema/engine/permission/integrity technical state. Add explicit sentinel tests proving period dates, symptoms, notes, sexual/fertility/pregnancy payloads cannot appear.

Commit: `web: add health-payload-free diagnostics and safe recovery`

---

### Task 17: Extend CI for shared contracts and Web/PWA

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `.github/workflows/web-pages.yml` only after local CI is green and deployment boundary is reviewed.
- Modify: `tool/privacy_scan.py`
- Modify: `tool/secret_scan.py` if needed for Web/backend extensions.
- Create: `verification/reference/test_web_release_structure.py`

**Do not remove existing jobs.** Add:
- `shared-contracts` job (Python + Flutter conformance vectors);
- `web-core` job on Node 24.21.0: `npm ci`, lint, typecheck, Vitest, static build;
- `web-e2e` Playwright job with Chromium/Firefox/WebKit as practical;
- Web privacy scan for URLs/cache/service-worker/forbidden analytics packages;
- npm dependency vulnerability audit/approved scanner and Web SBOM generation.

GitHub Pages workflow deploys only static Web output and requires no health secrets. Use least-privilege `contents: read`, `pages: write`, `id-token: write` only in the Pages deployment job. Production sync secrets never enter Pages builds.

Commit: `ci: add shared and Web C2 verification gates`

---

### Task 18: Wife PWA acceptance milestone — local/account-free

**Evidence file:** Create `docs/verification/WEB_PWA_LOCAL_ACCEPTANCE.md`.

Acceptance on an iPhone using Safari/Add to Home Screen plus desktop browser:
- install/open PWA;
- Continue privately with no account;
- add historical periods;
- prediction/window/confidence;
- 3-day reminder configuration and truthful Reminder Health;
- Today/logging/calendar/history;
- insights;
- report preview/export;
- CycleVault export/restore;
- Privacy Center;
- offline use/reopen;
- no HealthKit claim in PWA;
- no sensitive payload in URL/cache/network requests.

This milestone is valuable independently of Apple Developer membership and is completed **before** account/sync is allowed to block usability.

Commit: `docs: record local Sreva PWA acceptance evidence`

---

## Phase F — Security-gated optional account/E2EE continuity

### Task 19: E2EE protocol design gate — NO production code before this passes

**Files:**
- Create: `shared/crypto/e2ee-key-hierarchy-v1.md`
- Create: `shared/crypto/interoperability-vectors/e2ee-v1.json`
- Create: `shared/sync/protocol-v1.md`
- Create: `shared/sync/conflict-vectors/v1.json`
- Create: `docs/security/E2EE_THREAT_MODEL.md`
- Create: `docs/security/E2EE_PROTOCOL_REVIEW.md`

**Required protocol properties:**
- client-generated vault root secret;
- per-device cryptographic identity;
- server stores only public/device material, wrapped key material, ciphertext, minimum metadata;
- account authentication alone cannot derive health vault key;
- trusted-device enrollment securely authorizes a new device;
- user-held recovery secret can restore wrapped vault access;
- losing devices + recovery key makes old vault cryptographically unrecoverable;
- revocation blocks future sync but does not claim retroactive erasure;
- replay/tamper/cross-account substitution tests;
- algorithm/version agility and migration path;
- implementations available and maintained for Dart, modern browser, and Go.

**STOP condition:** If no standard, reviewed primitive/library set satisfies the three-client requirement, do not implement bespoke cryptography. Record the blocker and resolve it with a focused security design review.

Commit only after review: `security: freeze E2EE protocol v1 and interoperability vectors`

---

### Task 20: Scaffold provider-independent Go identity/sync service

**Precondition:** Task 19 green.

**Files:**
- Create: `sync_service/go.mod`
- Create: `sync_service/go.sum`
- Create: `sync_service/cmd/sreva-sync/main.go`
- Create: `sync_service/internal/httpapi/router.go`
- Create: `sync_service/internal/config/config.go`
- Create: `sync_service/internal/store/store.go`
- Create: `sync_service/internal/store/postgres/`
- Create: `sync_service/migrations/001_identity.sql`
- Create: `sync_service/migrations/002_devices.sql`
- Create: `sync_service/migrations/003_ciphertext_sync.sql`
- Create unit/integration tests.

Go pin: 1.27.1. Router: chi 5.3.2. PostgreSQL driver: pgx 5.11.0. PostgreSQL target: 18.6. Start as a modular monolith.

DB columns MUST NOT include semantic health fields such as `period_start`, `symptom`, `pregnancy_status`. Tests inspect migrations/schema names for forbidden health semantics.

Commit: `sync: scaffold ciphertext-only Go sync service`

---

### Task 21: Passkey account identity and verification-channel interfaces

**Files:**
- `sync_service/internal/auth/webauthn.go`
- `sync_service/internal/auth/session.go`
- `sync_service/internal/verification/sender.go`
- `sync_service/internal/verification/fake_sender.go`
- account/device routes + tests.

Use go-webauthn v0.17.4. Production email/SMS vendor is deliberately **not** selected in source at this stage: define a small `VerificationSender` interface and deterministic fake/local adapter. A production adapter is a deployment decision requiring cost, region/privacy, deliverability and security review. The production binary/configuration MUST fail closed if a phone/email OTP route is enabled without an approved sender.

Authentication tests cover email-only, phone-only, both, passkey registration/login, rate limits/replay/expired challenge, number/email change notifications, and account-vault separation.

Commit: `identity: add passkey-first account service boundary`

---

### Task 22: Ciphertext sync API and conflict semantics

**Files:**
- `sync_service/internal/sync/service.go`
- `sync_service/internal/sync/handlers.go`
- `sync_service/internal/devices/service.go`
- Web sync client: `web/src/sync/client.ts`, `web/src/sync/queue.ts`, tests.

Endpoints operate on opaque IDs, versions, ciphertext/envelopes and minimum timestamps only. Server never parses health payload. Add authorization tests for cross-account access, stale/replay version, revoked device, oversized payload, concurrent updates.

Web behavior: offline encrypted queue, idempotent upload, pull/apply after local decrypt/validation, conflict resolution per shared vectors, pause/disable sync.

Commit: `sync: add authorized opaque ciphertext synchronization`

---

### Task 23: Trusted-device approval and recovery-key flows

**Files:**
- `web/src/account/passkeys.ts`
- `web/src/account/trusted-devices.ts`
- `web/src/account/recovery.ts`
- private pages `/app/account`, `/app/devices`, `/app/recovery`, `/app/sync`.
- Go device/recovery endpoints and tests.

TDD scenarios:
1. Existing device approves new Web device.
2. Existing Web device approves new mobile device via protocol vector.
3. Recovery key restores vault after all trusted devices lost.
4. Email/SMS-only account recovery cannot unwrap old vault.
5. Revoked device cannot fetch new sync generations.
6. Account deletion removes server-side account/ciphertext according to policy without claiming to erase exports/copies on former devices.

Commit: `identity: add trusted-device and recovery-key continuity`

---

### Task 24: Mobile E2EE/account adapters without rewriting mobile health core

**Files:**
- Create: `lib/features/account/` domain/data/presentation boundaries.
- Create: `lib/features/sync/` domain/data/presentation boundaries.
- Create: `lib/core/crypto/e2ee/` protocol adapter.
- Add platform passkey/credential adapters under `platform_templates/android/` and `platform_templates/ios/` only where native API access is required.
- Add Flutter conformance tests reading `shared/crypto` and `shared/sync` vectors.

Do NOT move cycle/prediction/insight logic into the sync module. Local repository remains authoritative plaintext state; sync observes encrypted change records.

Commit: `mobile: add C2 account and E2EE continuity adapters`

---

## Phase G — Cross-platform closure, compliance, and release

### Task 25: 258-ID traceability becomes release-enforced

**Files:**
- Modify: `tool/verify_v1_traceability.py` or introduce `tool/verify_cross_platform_traceability.py` while retaining backward-compatible mobile command.
- Create: `shared/capabilities/evidence.v1.json`
- Create: `verification/reference/test_cross_platform_traceability.py`

Each applicable capability must map to implementation and executable evidence by platform. Adapted/N/A states require an explicit rationale. No blank/implicit green cells.

Run:

```bash
python tool/verify_v1_traceability.py
python tool/verify_cross_platform_traceability.py
flutter test
cd web && npm test -- --run && npx playwright test
```

Expected: 258/258 launch requirements structurally accounted for, with platform-specific evidence status; no unsupported feature falsely marked complete.

Commit: `verification: enforce 258-id cross-platform traceability`

---

### Task 26: Privacy/security/store-policy release gate for sync-enabled builds

**Files:**
- Modify: `PRIVACY.md`
- Modify: `SECURITY.md`
- Modify Web privacy-policy page/source.
- Modify: `docs/android/privacy-policy.html`
- Modify: `docs/android/PLAY_COMPLIANCE_CHECKLIST.md`
- Modify: `docs/android/PLAY_PRODUCTION_RUNBOOK.md`
- Add iOS/App Store privacy declaration checklist when native iOS distribution becomes active.

Only at this phase—when sync behavior actually exists and is intended to ship—change user-facing policy from current local-only runtime wording to explicit E2EE ciphertext-sync wording. Review Google Play Data Safety / health declarations and Apple privacy disclosures against the exact binaries/dependencies.

Commit: `compliance: align policies with shipping E2EE continuity`

---

### Task 27: Security, accessibility, performance and recovery hardening

Run/record:
- Flutter/mobile full suite;
- shared schema/vector suite;
- Web unit/integration/E2E across Chromium/Firefox/WebKit;
- WCAG 2.2 AA manual + automated review;
- sync API authorization/concurrency/fuzz tests;
- XSS/CSP/service-worker/cache review;
- dependency/SBOM/secret/privacy scans;
- backup/restore/migration corruption drills;
- account-recovery abuse scenarios;
- revoked-device/replay/tamper tests;
- offline 30-day/reconnect scenarios;
- performance budgets for initial public pages, app shell and common workspace actions.

Create: `docs/verification/C2_CROSS_PLATFORM_RELEASE_CLOSURE.md` with no real health data.

Commit: `verification: close C2 cross-platform release evidence`

---

### Task 28: Final wife-alpha and staged product acceptance

Acceptance sequence:

```text
Web/PWA wife alpha
→ Android wife alpha/regression
→ iOS native verification / distribution when signing exists
→ multi-device E2EE acceptance
→ small private beta
→ staged production
```

Verify user-visible equality rather than pixel identity: terminology, data, predictions, privacy, reports, reminders, life-stage behavior, recovery semantics and sync results agree across clients. Platform-native integrations may differ only as documented.

No production rollout if any privacy, migration, reminder, recovery, ciphertext-authorization, or data-loss gate is red.

---

## Files that must remain untouched unless a task explicitly requires a targeted compatibility change

- Existing Flutter feature implementation under `lib/` during Phases A–E except conformance-test adapters explicitly named above.
- `platform_templates/android/MainActivity.kt` and related Android tests until a native account/sync adapter task requires change.
- `platform_templates/ios/SrevaPlatformBridge.swift` until a native account/sync adapter task requires change.
- Android production/family-preview package identities.
- Existing mobile release signing secrets/workflows except additive CI dependencies.
- Existing CycleVault v1 crypto/format until Task 14 proves an interoperable change or keeps it identical.

## CI evolution summary

Current CI remains the base. Additive order:

```text
current Flutter/mobile gates
        +
shared contract/vector gates
        +
Web lint/type/unit/build
        +
Web browser/a11y/privacy gates
        +
(optional later) Go sync-service tests/security gates
        ↓
cross-platform 258-ID traceability
```

Never replace a stronger existing mobile gate with a weaker generic cross-platform gate.

## Milestones

1. **M0 — Documentation coherence:** C2 spec/audit/plan merged; no production code change.
2. **M1 — Shared contract foundation:** 258 IDs + schemas + vectors pass existing mobile behavior.
3. **M2 — Web shell/PWA:** public site + private route skeleton + installable offline shell.
4. **M3 — Wife-usable local PWA:** encrypted local vault + cycle/log/calendar/prediction/reminders/insights/reports/backup, no account required.
5. **M4 — Local Web parity:** Section 1 local-applicable capability evidence substantially complete; WCAG/privacy gates green.
6. **M5 — E2EE protocol freeze:** reviewed key hierarchy/sync/recovery protocol + cross-platform vectors.
7. **M6 — Account/Web sync:** passkeys, trusted devices, recovery, ciphertext sync on Web.
8. **M7 — Mobile continuity:** Android/iOS account/sync adapters pass same protocol vectors.
9. **M8 — 258-ID cross-platform closure:** all applicable cells implemented/verified or explicitly adapted/N/A with rationale.
10. **M9 — Worldwide hardening/release:** compliance, security, accessibility, performance, staged acceptance.

## Plan self-review checklist

- [x] Approved C2 architecture is not weakened to fit the older mobile plans.
- [x] Existing mobile code is preserved as a first-class implementation.
- [x] Web/PWA reaches useful local/account-free state before sync complexity.
- [x] Account-free and account modes remain equal in health features.
- [x] 258-ID traceability is introduced before claiming C2 completion.
- [x] No production sync cryptography is invented casually; protocol review is a hard gate.
- [x] Current mobile privacy/store claims remain truthful until sync actually ships.
- [x] Exact new file paths and primary interfaces are named.
- [x] Tests are written before implementation in each task.
- [x] CI additions are additive; existing Android/iOS gates are preserved.
- [x] No placeholder production SMS/email vendor is silently chosen.
- [x] Current Web/runtime dependency baseline is pinned; lockfiles become transitive-version authority.

## Execution handoff

After this plan is explicitly approved, begin with **Phase A / Task 1** only. Do not jump directly to Web screens. Complete and verify each task, keep commits small, and stop on any security/protocol gate rather than improvising around it.
