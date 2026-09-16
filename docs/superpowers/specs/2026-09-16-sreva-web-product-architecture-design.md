# SREVA Cross-Platform Product Architecture Design

**Document:** `docs/superpowers/specs/2026-09-16-sreva-web-product-architecture-design.md`  
**Status:** APPROVED DESIGN — authoritative C2 architecture constitution  
**Date:** 16 September 2026  
**Product:** Sreva  
**Scope:** Android, iOS, Browser Web, installable Web/PWA  
**Repository:** `Girish2052003/sreva-womens-health`  
**Architecture:** **C2 — Web-Native Monorepo**  
**Mobile:** Flutter / Dart  
**Web/PWA:** Next.js + React + TypeScript  
**Product model:** Local Sovereign Core + Optional End-to-End Encrypted Continuity

## 0. Authority, purpose, and precedence

This document is the authoritative architecture contract for Sreva after the 16 September 2026 C2 decision. It exists to prevent Android, iOS, and Web/PWA from becoming separate products.

When this document conflicts with the older `2026-09-15-sreva-master-design.md` or `2026-09-15-sreva-v1-implementation.md`, **this document wins**. The older documents remain useful as the already-built Flutter/mobile baseline and historical implementation record; they must be interpreted as subordinate to this cross-platform contract.

The core rule is:

> **One Sreva. One heart. Three first-class clients. No weakened edition.**

```text
                         SREVA
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
         Android          iOS            Web
       Flutter/Dart   Flutter/Dart   Next.js/React
                                            │
                                            └── installable PWA
```

The PWA is the installable form of the Web client, not a fourth independent product.

All clients MUST preserve the same product philosophy, health-data semantics, cycle model, prediction semantics, insight rules, reminder policy, life-stage rules, report semantics, privacy model, canonical data schemas, crypto/sync formats, terminology, capability contract, and conformance vectors. Platform presentation and OS adapters may differ.

### 0.1 Approved amendments to the 15 September mobile baseline

1. **Web is first-class.** Sreva Web is a complete health client, not a brochure.
2. **PWA is first-class Web delivery.** The same Web client works in a normal browser and, where supported, as an installed PWA.
3. **Account-free and account-based Sreva are equal-class.** Account mode adds encrypted continuity, not stronger health features.
4. **Optional E2EE sync is permitted.** The operator still MUST NOT operate a plaintext or developer-decryptable reproductive-health database. Sync infrastructure may hold ciphertext and minimum operational metadata only.
5. **Identity is flexible.** Email-only, mobile-only, or both are allowed; mobile number is optional; passkeys are preferred.
6. **Recovery is hybrid.** Passkey + trusted-device approval + user-held recovery key. Email/SMS may recover account identity but MUST NOT independently decrypt old health history.
7. **Reminder intent is shared, delivery is adapted.** Android/iOS use native scheduling; Web/PWA uses the strongest honest browser capability available.
8. **C2 presentation split is deliberate.** Flutter remains mobile; Next.js/React/TypeScript is Web/PWA. Shared contracts and conformance—not UI-code reuse—prevent drift.

### 0.2 Non-negotiable Sreva laws

1. One product across Android, iOS, and Web/PWA.
2. No supported client is intentionally a lite edition.
3. Core functionality requires no account.
4. Core health functionality remains usable without Internet.
5. Predictions execute locally.
6. Personal insights execute locally.
7. Plaintext reproductive-health data belongs on authorized user devices.
8. Optional sync encrypts sensitive content before it leaves the client.
9. Sreva infrastructure has no universal health-vault decryption secret.
10. Sensitive health values never enter ordinary analytics, crash telemetry, or debugging logs.
11. Updates and migrations preserve and validate existing history.
12. HealthKit/Health Connect access is granular, optional, and explicit.
13. Prediction uncertainty is displayed honestly.
14. Observation is not diagnosis.
15. V1 makes no certified contraception-effectiveness claim.
16. Partner sharing is opt-in, granular, and revocable.
17. Platform differences change mechanisms, not product meaning.
18. Complex engine; simple interface.

---

# SECTION 1 — MASTER CAPABILITY CONTRACT

Public marketing may continue to say **40+ thoughtfully designed cycle, wellness, privacy, and reproductive-health capabilities**. Internally, Sreva uses a stricter engineering decomposition so nothing disappears behind a broad feature label.

**Approved internal contract:** 18 launch capability families, **258 atomic launch-contract requirements**, plus 11 future/optional capabilities. The number 258 is an engineering traceability count, not public feature marketing.

| Family | Prefix | Count |
|---|---|---:|
| Cycle and periods | `CYC` | 15 |
| Predictions | `PRED` | 14 |
| Reminders | `REM` | 24 |
| Daily logging | `LOG` | 26 |
| Reproductive observations | `REPRO` | 10 |
| Life stages | `LIFE` | 9 |
| Insights | `INS` | 16 |
| Reports | `RPT` | 13 |
| Interaction / assistant | `INT` | 9 |
| Partner sharing | `PART` | 10 |
| Health integrations | `HEALTH` | 9 |
| Accessibility / worldwide | `A11Y` | 15 |
| Privacy | `PRIV` | 21 |
| Vault / backup / migration | `VAULT` | 14 |
| Diagnostics | `DIAG` | 11 |
| Identity / recovery | `ID` | 13 |
| E2EE sync / devices | `SYNC` | 15 |
| Web / PWA | `WEB` | 14 |
| **TOTAL** |  | **258** |

Every capability record MUST ultimately define: ID, name, description, launch status, Android/iOS/Web/PWA applicability, offline requirement, sync behaviour, privacy classification, accessibility requirement, tests, platform limitation, and marketing eligibility.

## 1.1 Cycle and period tracking — `CYC`

```text
CYC-001  One-tap "Period started today"
CYC-002  End current period
CYC-003  Backdate or correct period dates
CYC-004  Flow logging: spotting/light/medium/heavy
CYC-005  Period-duration tracking
CYC-006  Cycle-length tracking
CYC-007  Previous-period history
CYC-008  Irregular-cycle support
CYC-009  Monthly calendar
CYC-010  Timeline view
CYC-011  Year view
CYC-012  Historical editing
CYC-013  Cycle/period notes
CYC-014  Automatic cycle statistics
CYC-015  Never force a 28-day-cycle assumption
```

## 1.2 Prediction engine — `PRED`

```text
PRED-001  Next expected period
PRED-002  Expected period window
PRED-003  Prediction confidence
PRED-004  Cycle-length trend
PRED-005  Period-duration prediction
PRED-006  PMS window
PRED-007  Ovulation estimate where enabled
PRED-008  Fertile-window estimate where enabled
PRED-009  Automatic recalculation when health history changes
PRED-010  Wider uncertainty windows for irregular cycles
PRED-011  Prediction history
PRED-012  Algorithm version stored with prediction
PRED-013  Prediction input snapshot/reference
PRED-014  Prediction accuracy evaluation against outcomes
```

## 1.3 Adaptive reminders — `REM`

```text
REM-001  Default three-day-before-period reminder
REM-002  Optional seven-day reminder
REM-003  Optional one-day reminder
REM-004  Expected-period-day reminder
REM-005  Late-period reminder
REM-006  Medication reminders
REM-007  Contraceptive reminders
REM-008  Supplement reminders
REM-009  Ovulation-test reminders
REM-010  Pregnancy-test reminders
REM-011  User-selected notification time
REM-012  Quiet hours
REM-013  Snooze
REM-014  "Period started" notification action where supported
REM-015  Time-zone-aware scheduling
REM-016  Daylight-saving-aware scheduling
REM-017  Automatic rescheduling when prediction changes
REM-018  Notification-permission health check
REM-019  Discreet notification contents
REM-020  Detailed notification contents only when opted in
REM-021  Reminder Health dashboard
REM-022  Next scheduled reminder visibility
REM-023  Rebuild plan after relevant reboot/time/update/permission events where supported
REM-024  Adaptive Android/iOS/PWA/browser delivery mechanism
```

## 1.4 Daily health logging — `LOG`

```text
LOG-001 Cramps
LOG-002 Headache/migraine
LOG-003 Back pain
LOG-004 Breast tenderness
LOG-005 Bloating
LOG-006 Acne
LOG-007 Nausea
LOG-008 Digestion
LOG-009 Fatigue
LOG-010 Dizziness
LOG-011 Appetite/cravings
LOG-012 Sleep
LOG-013 Energy
LOG-014 Stress
LOG-015 Mood
LOG-016 Anxiety/irritability
LOG-017 Libido
LOG-018 Vaginal discharge
LOG-019 Cervical mucus
LOG-020 Basal body temperature
LOG-021 Weight
LOG-022 Exercise
LOG-023 Water
LOG-024 Custom symptoms
LOG-025 Severity scales
LOG-026 Notes
```

## 1.5 Optional reproductive observations — `REPRO`

```text
REPRO-001 Ovulation-test recording
REPRO-002 Pregnancy-test recording
REPRO-003 Basal-temperature fertility observations
REPRO-004 Cervical-mucus observations
REPRO-005 Sexual-activity logging
REPRO-006 Protection-used logging
REPRO-007 Contraception context
REPRO-008 Fertility observations
REPRO-009 Pregnancy-planning context
REPRO-010 No certified avoid-pregnancy claim in initial release
```

## 1.6 Life-stage engine — `LIFE`

```text
LIFE-001 Regular-cycle mode
LIFE-002 Trying-to-conceive mode
LIFE-003 Pregnancy mode
LIFE-004 Postpartum mode
LIFE-005 Breastfeeding context
LIFE-006 Perimenopause mode
LIFE-007 Menopause-transition tracking
LIFE-008 Hormonal-contraception context
LIFE-009 Changing mode never deletes previous history
```

## 1.7 Insights — `INS`

```text
INS-001 Average cycle length
INS-002 Average period duration
INS-003 Cycle variation
INS-004 Shortest cycle
INS-005 Longest cycle
INS-006 Flow patterns
INS-007 Symptom trends
INS-008 PMS patterns
INS-009 Mood trends
INS-010 Pain trends
INS-011 Sleep correlations
INS-012 Historical graphs
INS-013 Personal pattern observations
INS-014 Explain where an insight came from
INS-015 Never invent medical explanations
INS-016 Prediction-accuracy insight/history
```

Invariant: **Observation ≠ diagnosis.**

## 1.8 Doctor / healthcare reports — `RPT`

```text
RPT-001 Select report date range
RPT-002 Select included categories
RPT-003 Generate concise cycle-history report
RPT-004 Period dates
RPT-005 Flow history
RPT-006 Pain/symptom history
RPT-007 Temperature/ovulation observations
RPT-008 Optional notes
RPT-009 CSV export
RPT-010 PDF export
RPT-011 Preview report before sharing
RPT-012 Generate report locally
RPT-013 User decides exactly what is exported
```

## 1.9 Interaction and assistant — `INT`

```text
INT-001 Tap-based interaction
INT-002 Text interaction
INT-003 Voice interaction where supported
INT-004 Natural-language command box
INT-005 Local structured intent extraction
INT-006 Confirmation when ambiguous
INT-007 Ask questions about personal history
INT-008 Create reminders using natural language
INT-009 Search historical records
```

Private speech MUST NOT silently be sent to an external speech/AI provider.

## 1.10 Partner sharing — `PART`

```text
PART-001 Completely opt-in partner mode
PART-002 Granular sharing grant
PART-003 Share predicted period
PART-004 Share cycle phase
PART-005 Share selected reminders
PART-006 Share selected wellness status
PART-007 Sensitive categories excluded by default
PART-008 Revoke access immediately
PART-009 Manual/zero-backend sharing path
PART-010 E2EE live-sharing transport interface
```

There is no automatic spouse/partner access model.

## 1.11 Platform health integration — `HEALTH`

```text
HEALTH-001 Apple HealthKit integration
HEALTH-002 Android Health Connect integration
HEALTH-003 Import supported reproductive-health records
HEALTH-004 Export supported records where platform permits
HEALTH-005 Explicit granular permissions
HEALTH-006 Record provenance/source tracking
HEALTH-007 External record ID/revision tracking
HEALTH-008 Duplicate prevention/deduplication
HEALTH-009 Sreva vault remains authoritative application datastore
```

## 1.12 Accessibility and worldwide readiness — `A11Y`

```text
A11Y-001 Dark mode
A11Y-002 Light mode
A11Y-003 Dynamic text/scaling
A11Y-004 Screen-reader support
A11Y-005 Colour-blind-safe states
A11Y-006 One-handed mobile interaction
A11Y-007 Low-literacy/easy-language mode
A11Y-008 RTL languages
A11Y-009 Localization infrastructure
A11Y-010 Metric/imperial settings
A11Y-011 Locale-specific dates
A11Y-012 12/24-hour time
A11Y-013 Offline operation
A11Y-014 Poor-network resilience
A11Y-015 High-contrast presentation
```

## 1.13 Privacy and app protection — `PRIV`

```text
PRIV-001 Biometric app lock
PRIV-002 PIN fallback
PRIV-003 Hide sensitive notification contents
PRIV-004 Offline-only operation
PRIV-005 Full no-account mode
PRIV-006 Delete individual records
PRIV-007 Delete account
PRIV-008 Export all user data
PRIV-009 Review permissions
PRIV-010 Review connected devices
PRIV-011 Review partner access
PRIV-012 Revoke partner access
PRIV-013 Session/device management
PRIV-014 Automatic lock
PRIV-015 App-switcher preview protection
PRIV-016 Clipboard restrictions where supported
PRIV-017 Sensitive-screen protection where supported
PRIV-018 Maximum/Balanced/Detailed notification privacy
PRIV-019 "Why is this stored?" transparency
PRIV-020 No health payload in ordinary logs/analytics
PRIV-021 No advertising profile from reproductive-health data
```

## 1.14 Vault, backup, migration — `VAULT`

```text
VAULT-001 Encrypted local health vault
VAULT-002 Device-protected encryption key
VAULT-003 Encrypted CycleVault backup
VAULT-004 Versioned backup format
VAULT-005 Backup integrity metadata
VAULT-006 User-selected backup destination
VAULT-007 Restore integrity validation
VAULT-008 Schema-compatibility validation
VAULT-009 Atomic restore
VAULT-010 Pre-migration snapshot
VAULT-011 Transactional database migration
VAULT-012 Rollback on migration failure
VAULT-013 Support users skipping application versions
VAULT-014 Health-vault integrity check
```

## 1.15 Privacy-preserving diagnostics — `DIAG`

```text
DIAG-001 User-generated sanitized diagnostic export
DIAG-002 Preview diagnostic report before sharing
DIAG-003 App version
DIAG-004 Database-schema version
DIAG-005 Prediction-engine version
DIAG-006 Reminder-engine version
DIAG-007 Health-adapter version/status
DIAG-008 Notification state
DIAG-009 Last migration status
DIAG-010 Integrity-check status
DIAG-011 Never include health payloads by default
```

## 1.16 Identity and recovery — `ID`

```text
ID-001 Full account-free Sreva experience
ID-002 Full account-based Sreva experience
ID-003 Email-only account permitted
ID-004 Mobile-number-only account permitted
ID-005 Email + mobile-number account permitted
ID-006 Mobile number remains optional
ID-007 Passkey setup/sign-in
ID-008 Trusted-device approval
ID-009 Emergency recovery key
ID-010 Email may recover account identity
ID-011 SMS may recover account identity
ID-012 Email/SMS alone cannot decrypt old vault
ID-013 Account-free and account modes remain equal-class
```

## 1.17 E2EE synchronization and devices — `SYNC`

```text
SYNC-001 End-to-end encrypted multi-device sync
SYNC-002 Android ↔ iOS ↔ Web continuity
SYNC-003 Server stores health content only as ciphertext
SYNC-004 Encrypt locally before synchronization
SYNC-005 Decrypt locally after synchronization
SYNC-006 Trusted-device list
SYNC-007 Rename trusted device
SYNC-008 Remove/revoke device
SYNC-009 Pause synchronization
SYNC-010 Disable synchronization
SYNC-011 Last successful sync state
SYNC-012 Pending-change state
SYNC-013 Deterministic/conflict-safe reconciliation
SYNC-014 New-device approval/key transfer
SYNC-015 Infrastructure cannot decrypt health vault
```

## 1.18 Web and PWA — `WEB`

```text
WEB-001 Full browser-based Sreva client
WEB-002 Installable PWA
WEB-003 Standalone Home Screen/Desktop experience
WEB-004 Offline PWA application shell
WEB-005 Encrypted browser-local health vault
WEB-006 Web Push where supported
WEB-007 Browser/in-app reminder fallback
WEB-008 Easy iPhone PWA-install guidance
WEB-009 Easy Android/PWA-install guidance
WEB-010 Responsive desktop/tablet/mobile layouts
WEB-011 Shareable/deep-linkable public pages
WEB-012 Seamless public-site → private-workspace transition
WEB-013 Android download/store entry
WEB-014 Native iOS store entry when available
```

## 1.19 Future/optional — not launch promises

```text
FUT-001 Apple Watch / Wear OS logging
FUT-002 Home-screen widgets
FUT-003 Siri / App Intents
FUT-004 Android shortcuts
FUT-005 Advanced secure AI wellness assistant
FUT-006 Clinician portal
FUT-007 Expanded family-planning features
FUT-008 Clinician-reviewed educational library
FUT-009 Regional healthcare resources
FUT-010 On-device personalized ML
FUT-011 Research participation with separate explicit consent
```

---

# SECTION 2 — VISUAL DESIGN SYSTEM

Sreva MUST feel premium, private, modern, warm, feminine, calm, elegant, futuristic, and accessible. It MUST NOT become childish-pink, clinically cold, hypersexualized, marketplace-dense, or neon-AI themed.

Public Sreva may be expressive: warm white/pearl surfaces, deep rose/crimson, restrained gradients, subtle depth, gentle motion, visual storytelling. The private health workspace is calmer: clean surfaces, limited accents, large readable information, one obvious primary action, minimal decoration.

Use semantic design tokens rather than hard-coded colours: `sreva-crimson`, `sreva-rose`, `sreva-pink`, `sreva-blush`, `sreva-pearl`, `sreva-ink`, `sreva-muted`, plus `success`, `warning`, `danger`, and `info`. Exact values are finalized against the Sreva logo and accessibility contrast tests. Colour is never the only state signal.

Typography must support worldwide scripts, scale accessibly, and use ultra-easy language. Components are shared conceptually across clients: buttons, inputs, date controls, cards, sheets/dialogs, banners/toasts, tabs, navigation, charts, calendars, timelines, status chips, permission cards, privacy indicators, empty/loading/error states.

Motion explains state, not decoration. Web honors `prefers-reduced-motion`; mobile honors equivalent OS accessibility settings. Charts always provide textual summaries, labels, units, range, and non-colour distinctions.

---

# SECTION 3 — NAVIGATION AND RESPONSIVE BEHAVIOUR

Public desktop navigation is intentionally concise: Features, How it works, Privacy, Security, Help, Download, and a clear **Open Sreva** action.

Mobile/PWA private navigation targets five primary destinations: **Home, Today, Log, Calendar, More**. Desktop uses a compact rail with Home, Today, Calendar, Insights, Log Today, and More. The Home screen prioritizes: when is the next period, what needs logging, whether the period started, and reminder health.

Web is one responsive product across small phone, large phone, tablet, laptop, desktop, and ultra-wide. Meaningful private routes such as `/app/home`, `/app/today`, `/app/calendar`, `/app/insights`, `/app/reminders`, `/app/privacy`, and `/app/settings` must support normal browser back/forward/refresh/deep-link behavior while still requiring vault authorization before sensitive content is revealed.

Private health search operates locally after vault unlock wherever feasible; sensitive search terms are never forwarded to public search engines.

---

# SECTION 4 — LOCAL ENCRYPTED BROWSER VAULT

Sreva Web stores sensitive health data only after application-layer encryption. Sensitive health values MUST NOT be stored in plaintext `localStorage` or URL state. Persistent records may use IndexedDB or another validated browser persistence API.

A cryptographically strong vault key is generated locally. Established, reviewed primitives/libraries are used; Sreva does not invent proprietary cryptography. Where supported, WebCrypto, non-exportable/protected key material, and WebAuthn/passkey gates are used. Browser protections MUST NOT be described as automatically equivalent to Android Keystore or Apple Keychain/Secure Enclave.

Plaintext is decrypted only when needed and transient decrypted state/key references are cleared on lock/logout as far as browser controls permit.

Account-free Web remains full Sreva. Users must be warned that clearing browser/site storage can remove a local-only vault; encrypted CycleVault backup is therefore strongly encouraged. Persistent browser storage is requested where appropriate but never treated as infallible.

Service workers may cache the application shell, CSS, fonts, icons, public assets, and version metadata, but MUST NOT accidentally cache plaintext health payloads.

---

# SECTION 5 — E2EE ACCOUNT AND SYNC ARCHITECTURE

Fundamental invariant:

```text
AUTHORIZED CLIENT                 SREVA SYNC SERVICE                AUTHORIZED CLIENT
plaintext → encrypt locally  →   ciphertext + minimum metadata  →  decrypt locally → plaintext
                                   NO HEALTH DECRYPTION KEY
```

Server-visible metadata is minimized to operational necessities such as opaque account/device/object IDs, ciphertext size, version counters, synchronization timestamps, and revocation state. The server does not receive readable period dates, flow, symptoms, sexual activity, fertility/pregnancy information, medication details, mood, notes, predictions, or doctor reports.

Sync prefers encrypted logical records/events rather than repeatedly uploading one monolithic database. Records carry opaque ID, schema/logical version, encrypted payload, and integrity/authentication data.

Independent edits merge safely; ambiguous same-record conflicts are shown in health language and require user choice. Each authorized device has a cryptographic identity. Revocation blocks future authorization/sync and rotates/re-wraps secrets where required, but MUST NOT claim it can remotely erase data that a device already decrypted.

Account-free → account transition preserves existing history and adds encrypted sync without re-entry. Disabling sync never disables local Sreva.

---

# SECTION 6 — AUTHENTICATION AND RECOVERY

Account identifiers: email, mobile number, or both. Mobile number is optional. Sreva is passkey-first.

Normal authentication prefers passkeys. Verified email/SMS may recover account identity, but account authentication is separate from health-vault decryption.

Preferred new-device recovery: authenticate account → existing trusted device approves → secure vault-key authorization. Emergency recovery: account authentication + user-held Sreva recovery key → recover vault access.

The recovery key is generated/handled so Sreva servers cannot use it to decrypt the vault. If every trusted device and the recovery key are lost but email/phone remains, the account identity may be recovered while the old E2EE vault remains unreadable. There is no undocumented administrator recovery key.

Changing recovery contacts requires strong authentication, verification of the new destination, and security notification to existing trusted channels.

---

# SECTION 7 — PWA, OFFLINE, AND ADAPTIVE REMINDERS

The Web client supports normal browser usage and, where supported, Home Screen/desktop installation, standalone display, offline shell, encrypted local data, and service-worker capabilities.

Offline core behavior includes period recording/editing, symptom logging, calendar/history, local predictions, local insights, existing reminder state, supported local reports, and local search. Offline changes are stored locally and queued for encrypted synchronization when connectivity returns.

Reminder delivery adapts honestly:

- Android: native Android scheduling APIs.
- iOS: native local notification facilities.
- Installed PWA: local state + service worker + Web Push/browser capabilities where available.
- Ordinary browser: in-app state + browser notifications where available.

Web/PWA MUST NOT pretend to guarantee closed-app delivery where the browser cannot. Maximum-privacy mode avoids unnecessary remote reminder timing metadata but may reduce closed-app reliability. Enhanced Web delivery is explicit opt-in and sends only minimum opaque delivery metadata plus generic/encrypted notification content.

Every platform exposes Reminder Health: permission, enabled state, next reminder, delivery mechanism, timezone state, background capability, privacy mode. PWA/service-worker updates MUST NOT delete the vault and must validate schema compatibility before activation.

---

# SECTION 8 — SHARED CONTRACT AND CONFORMANCE TESTING

The anti-drift source of truth lives under `shared/` and is language-neutral where practical:

```text
shared/
├── capabilities/
├── schemas/
├── terminology/
├── localization/
├── design-tokens/
├── prediction/{specification,test-vectors}/
├── reminders/test-vectors/
├── crypto/{format,interoperability-vectors}/
├── sync/{protocol,conflict-vectors}/
└── fixtures/
```

C2 deliberately allows a Dart mobile core and TypeScript Web core, but semantic divergence is forbidden. Same canonical input + same engine version = contract-equivalent result.

Prediction vectors cover regular/irregular cycles, missing/corrected/deleted data, outliers, leap years, timezone boundaries, and insufficient history. Reminder intent has the same semantics on every platform; only scheduling adapters differ. Canonical schemas define health record meaning independent of language.

Mandatory crypto interoperability property: Android encrypts → Web decrypts; Web encrypts → iOS decrypts; iOS encrypts → Android decrypts, using approved golden vectors/test keys. Sync conformance covers offline devices, simultaneous edits, conflicts, duplicates, tombstones, out-of-order updates, new/revoked devices, schema upgrades, key changes, and recovery.

Version independently where required: mobile app, Web client, domain schema, vault format, prediction engine, reminder engine, sync protocol, crypto envelope, CycleVault format.

Every implementation PR SHOULD reference capability IDs and corresponding tests. The current 22-family `tool/verify_v1_traceability.py` is a mobile-baseline verifier; the C2 implementation plan must extend traceability to the 258 atomic cross-platform registry without breaking existing mobile evidence.

---

# SECTION 9 — REPOSITORY AND DEPLOYMENT ARCHITECTURE

One authoritative repository:

```text
sreva-womens-health/
├── lib/                         # existing Flutter mobile client
├── platform_templates/{android,ios}/
├── web/                         # Next.js/React/TypeScript Web/PWA
├── shared/                      # canonical contracts/vectors
├── sync_service/                # optional E2EE identity/sync backend
├── test/
├── verification/
├── tool/
├── docs/
└── .github/workflows/
```

Initial Web/PWA deployment is static and low-cost: Next.js static export → GitHub Pages. GitHub Pages hosts the frontend, not the sync service. Account-free Sreva therefore needs no Sreva backend for core operation.

The sync/identity protocol is provider-independent. Logical interfaces may include Identity API, Device API, Sync API, Recovery-metadata API, and optional Push relay. Avoid premature microservices.

Production may later move the static Web deployment to a host/CDN that satisfies required security headers, rollback, origin controls, custom-domain, observability, and DDoS needs. Moving the host must not require a product rewrite.

Anything in the browser bundle is public: never include database passwords, administrator secrets, signing keys, SMS-provider secrets, master encryption keys, or service credentials. Web deployment gates include lint, type checks, unit/contract/a11y/security tests, dependency review, static build, PWA validation, browser smoke tests, and capability regression.

---

# SECTION 10 — ERROR HANDLING AND RECOVERY STATES

Fundamental rule: **failure must not silently become data loss.**

Design explicitly for no Internet, sync-service outage, locked vault, wrong recovery key, browser storage pressure, corruption, migration/report failure, revoked notification permission, unsupported Web Push, revoked device, sync conflict, service-worker update failure, identity recovery without vault key, and corrupt backup.

Offline/sync failure: save locally → queue encrypted change → show calm status → retry later. Health logging continues.

Restore never overwrites current history until the candidate backup authenticates, decrypts, passes integrity/schema/domain validation in a temporary state, and can be atomically committed. Migration uses pre-migration recovery state, transaction, validation, rollback.

If integrity cannot be established, enter a safe/read-only recovery state that preserves data and offers repair, encrypted export, and sanitized diagnostics. Human conflict UX uses health meaning, not database jargon. Empty states never fabricate personal health data. Errors prefer simple language such as “We couldn't save this change yet. Your existing information is safe.”

Diagnostics default to technical metadata only and exclude health payloads.

---

# SECTION 11 — QA, SECURITY, AND ACCESSIBILITY

Testing layers: unit/property/schema/security → contract/conformance → integration → E2E.

Mandatory domain coverage includes cycle, period, logging, predictions, insights, life-stage rules, reports, reminder policy. Prediction tests include unit/property/historical simulation/boundary/irregular/missing/outlier/accuracy regression. Reminder tests include DST, timezone/manual clock changes, restart/update, permission revoke/restore, offline state, early/late period, leap year, month/year boundary, prediction change.

Vault tests cover encryption/decryption, wrong key, tampering, truncation, corrupt backup, schema mismatch, rollback, old/future schema behavior, atomic restore, integrity. Sync tests cover offline/multiple-device/simultaneous/out-of-order/duplicate/deletion/revocation/new-device/conflict/key-change/recovery/network interruption. Authentication tests cover passkey, email-only, phone-only, both, trusted-device enrollment, lost device/key, account recovery, number change, revocation, and malicious recovery attempt.

Web release testing covers representative Safari iPhone/iPad, Chrome Android/desktop, Edge, Firefox, Safari macOS; normal browser and installed PWA where supported. Layout testing covers small/large phones, tablets, laptop, desktop, high zoom, touch, mouse, and keyboard-only use.

Web accessibility target: **WCAG 2.2 AA minimum**. Release gates cover keyboard/focus, screen reader, large text/200%+ zoom, high contrast, reduced motion, RTL, colour deficiency, chart alternatives, target sizes, labels, and error announcements. Internationalization tests cover long/short strings, RTL, non-Latin scripts, locale dates, number/unit/time formatting, timezones, and pluralization.

Threat model includes stolen device, malicious partner, account takeover, sync DB breach, rogue administrator, authorization/session bugs, backup leakage, log/analytics/push leakage, screenshot/task-switcher exposure, rooted/jailbroken device, dependency compromise, plus Web XSS, CSRF where relevant, clickjacking, service-worker compromise, token leakage/session fixation, sync replay, ciphertext tampering, device impersonation, recovery abuse, and malicious-browser-extension boundary.

Privacy tests verify no sensitive health payload in logs/analytics/crash data, no plaintext health records in caches, no sensitive health information in URLs, no detailed sensitive notification by default, and no external AI upload without a separately approved future architecture.

CI progressively enforces dependency pinning, lock files, secret scanning, SAST, dependency review, vulnerability checks, SBOM, license checks, crypto vectors, capability conformance, and protected release workflows. Usability testing begins with wife-alpha but expands across ages, cycle patterns, life stages, languages, technical confidence, accessibility needs, and devices.

---

# 12. Cross-platform parity matrix

| Capability class | Android | iOS | Web/PWA |
|---|:---:|:---:|:---:|
| Cycle tracking | Full | Full | Full |
| Period history/editing | Full | Full | Full |
| Daily health logs | Full | Full | Full |
| Predictions | Full | Full | Full |
| Insights | Full | Full | Full |
| Life stages | Full | Full | Full |
| Reports | Full | Full | Full |
| Local vault | Full | Full | Full |
| Account-free operation | Full | Full | Full |
| Account operation | Full | Full | Full |
| E2EE sync | Full target | Full target | Full target |
| Recovery key | Full target | Full target | Full target |
| Passkey identity | Platform-adapted | Platform-adapted | Full target |
| Partner permissions | Full | Full | Full |
| Localization | Full | Full | Full |
| Accessibility | Full | Full | Full |
| Health Connect | Native | N/A | N/A |
| HealthKit | N/A | Native | N/A |
| Reminder delivery | Native | Native | Browser-adapted |
| Biometric vault gate | Native | Native | WebAuthn/browser-adapted |
| Offline | Full | Full | Full PWA / adapted browser |
| PWA installation | Optional Web path | Optional Web path | Native Web capability |

`N/A` means an OS-specific integration does not exist on that platform; it does not mean the underlying Sreva health capability disappears.

# 13. Authoritative shared-core law

“Same heart and core engine” means the canonical Sreva domain is the cycle semantics, prediction specification, insight rules, reminder policy, life-stage rules, report semantics, privacy rules, data schemas, crypto formats, sync semantics, terminology, capability registry, and golden vectors. Android, iOS, and Web MUST conform.

# 14. Platform-adapter law

Platform-dependent code is isolated:

- Android: Health Connect, notification scheduler, Keystore/biometrics, Android sharing.
- iOS: HealthKit, `UNUserNotificationCenter`, Keychain/Secure Enclave, Face ID/Touch ID, iOS sharing.
- Web: WebCrypto, IndexedDB, WebAuthn, Service Worker, Web Push, browser storage/sharing.

Cycle/prediction/insight rules MUST NOT be buried inside platform adapters.

# 15. Public site and private workspace

Public routes include `/`, `/features`, `/how-it-works`, `/cycle-tracking`, `/predictions`, `/reminders`, `/insights`, `/life-stages`, `/doctor-reports`, `/privacy`, `/security`, `/sync`, `/accessibility`, `/download`, `/install/iphone`, `/install/android`, `/install/pwa`, `/help`, `/about`, `/release-notes`, `/privacy-policy`, `/terms`, `/security/report`.

Private workspace includes `/app`, `/app/home`, `/app/today`, `/app/calendar`, `/app/log`, `/app/cycle`, `/app/predictions`, `/app/reminders`, `/app/symptoms`, `/app/wellness`, `/app/medication`, `/app/reproductive-health`, `/app/life-stage`, `/app/insights`, `/app/reports`, `/app/assistant`, `/app/sharing`, `/app/vault`, `/app/sync`, `/app/devices`, `/app/privacy`, `/app/account`, `/app/recovery`, `/app/settings`.

The transition is “Sreva website → Open Sreva → my private Sreva space,” not a visual/product jump.

# 16. Privacy Center contract

All clients SHOULD show truthful status for health-data location, encrypted sync state, operator-readable health DB (none), health analytics payload (none), trusted devices, notification privacy, app lock, health integration, partner access, and backup state.

# 17. Account-mode equality

```text
                ACCOUNT FREE      ACCOUNT
Cycle              YES              YES
Logging            YES              YES
Predictions        YES              YES
Insights           YES              YES
Reports            YES              YES
Reminders          YES              YES
Privacy            YES              YES
Local vault        YES              YES
Cross-device sync   NO               YES
Device continuity  manual            YES
Account recovery   N/A               YES
```

Any future commercial model requires an explicit architecture amendment before it can weaken this equality.

# 18. Data ownership model

Distinguish **local authoritative health state** from **remote encrypted synchronization copies**. The sync service is not the health-intelligence engine. Predictions, insights, interpretation, and reports remain client-side.

# 19. Medical/regulatory boundary

Initial Sreva is cycle/menstrual-health tracking, wellness observations, reminders, estimates, and personal history. It does not casually claim diagnosis, treatment recommendation, certified contraception, disease prediction, or clinical fertility guarantee. Regulated functionality is a separate future programme.

# 20. Definition of Done

A launch capability is not complete until implementation exists; unit/domain tests pass; cross-platform contract passes; privacy/offline behavior is validated where applicable; accessibility/localization readiness is validated; error/recovery behavior exists; capability registry is updated; and no undocumented parity drift remains.

# 21. Design-freeze rule

Implementation MUST NOT silently alter account-free equality, local prediction/insights, E2EE sync/recovery boundaries, privacy rules, platform parity, first-class Web status, or C2 architecture. Any fundamental change requires documented conflict → affected-capability analysis → explicit architecture amendment → spec update → implementation.

# 22. Initial monorepo target

```text
sreva-womens-health/
├── lib/                         # existing Flutter client
├── platform_templates/{android,ios}/
├── web/                         # Next.js/React/TypeScript
├── shared/
│   ├── capabilities/
│   ├── schemas/
│   ├── terminology/
│   ├── localization/
│   ├── design-tokens/
│   ├── prediction/
│   ├── reminders/
│   ├── crypto/
│   ├── sync/
│   └── fixtures/
├── sync_service/                # optional E2EE account/sync backend
├── test/
├── verification/
├── tool/
├── docs/superpowers/{specs,plans}/
└── .github/workflows/
```

Existing Flutter/native code is preserved unless a reviewed cross-platform contract requires a targeted change.

# 23. Macro build order

```text
Documentation/alignment
→ shared contracts and 258-ID traceability
→ Web shell/design system/public routes
→ encrypted browser-local vault
→ cycle/calendar/logging parity
→ prediction/reminder conformance
→ insights/reports/life-stage parity
→ PWA/offline/install experience
→ identity/passkeys
→ reviewed E2EE protocol and sync service
→ trusted-device/recovery flows
→ partner sharing continuity
→ native/mobile sync adapters
→ cross-platform conformance closure
→ accessibility/security/performance/release hardening
```

# 24. Final architecture statement

> **Sreva is a full women's cycle and wellness companion whose personal health intelligence remains with the woman, while optional end-to-end encrypted synchronization gives her seamless continuity across Android, iOS, and Web.**

The clients have different operating environments, adapters, and presentation implementations where necessary, but retain the same product ideology, privacy philosophy, health semantics, prediction contract, data model, life-stage logic, reminder intent, insight boundaries, account model, recovery guarantees, encryption/sync format, and capability contract.

**One Sreva. Three clients. No weakened edition.**

# 25. Approved design status

```text
SECTION 1   Capability Registry                  APPROVED
SECTION 2   Visual Design System                 APPROVED
SECTION 3   Navigation / Responsive Behaviour    APPROVED
SECTION 4   Local Encrypted Browser Vault        APPROVED
SECTION 5   E2EE Account / Sync                  APPROVED
SECTION 6   Authentication / Recovery            APPROVED
SECTION 7   PWA / Offline / Reminders            APPROVED
SECTION 8   Shared Contract / Conformance        APPROVED
SECTION 9   Deployment Architecture              APPROVED
SECTION 10  Error Handling / Recovery            APPROVED
SECTION 11  QA / Security / Accessibility        APPROVED

Architecture: C2 WEB-NATIVE MONOREPO             APPROVED
Android                                           FIRST-CLASS
iOS                                               FIRST-CLASS
Web / PWA                                         FIRST-CLASS
Account-free mode                                 FIRST-CLASS
Account + E2EE sync mode                          FIRST-CLASS
```

# END OF APPROVED SREVA CROSS-PLATFORM DESIGN SPECIFICATION
