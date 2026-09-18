# Sreadya C2 Cross-Platform Consistency Audit

**Date:** 16 September 2026  
**Branch:** `docs/c2-cross-platform-alignment`  
**Authoritative design:** `docs/superpowers/specs/2026-09-16-sreadya-web-product-architecture-design.md`  
**Audit basis:** approved `SREADYA MENSTRUAL WEBSITE PLANNING SPECS.md` maintenance log + repository state at `main` commit `9c228f873fa74944896118a53205a117e50ed7c7`.

## 1. Audit objective

Reconcile the existing Flutter/mobile plans and public documentation with the approved C2 architecture without weakening the C2 decision. The repository must tell one coherent story:

> **One Sreadya, three first-class clients — Android, iOS, Web/PWA — with the same health semantics, privacy philosophy, capability contract, and conformance rules.**

Existing Flutter code is treated as the mature mobile baseline, not a competing architecture. New Web/PWA and optional E2EE continuity extend that baseline through shared contracts.

A second preservation objective is equally important: **C2 must amend the earlier plans without erasing useful historical mobile requirements, tests, algorithms, interfaces, or release constraints.** The 15 September master specification and implementation plan therefore preserve their original detail and add C2 interpretation/precedence notices around it.

## 2. Repository facts confirmed

- `main` is currently a Flutter/Dart mobile codebase with Android/iOS native adapters generated from `platform_templates/`.
- Current mobile release line is `1.0.0+1`.
- Android package identity is `com.sreadya.health.sreadya`; family preview uses `com.sreadya.health.sreadya.preview`.
- Existing `lib/` already contains feature-oriented mobile modules for cycle, predictions, reminders, logging, life stages, insights, reports, backup, privacy, diagnostics, partner sharing, assistant, and health integration.
- Existing CI verifies Flutter core, Android production/family-preview paths, and iOS no-codesign compilation.
- `tool/verify_v1_traceability.py` currently closes 22 broad mobile capability families against implementation/evidence.
- No Next.js/React Web client, Web/PWA vault, passkey account system, trusted-device recovery, or E2EE sync service exists in the repository yet.

## 3. Conflicts found and authoritative resolutions

| ID | Existing state | Conflict with approved C2 | Resolution |
|---|---|---|---|
| A-01 | Old master spec lists only iOS and Android | Web/PWA is now a first-class client | C2 spec is authoritative; old master is preserved as the detailed mobile baseline and explicitly points to C2 |
| A-02 | Old master records iPhone 17 / iOS-first historical launch intent | Current release engineering prioritizes Android distribution; PWA is the immediate iPhone path | Preserve historical wording as provenance but remove its product-wide authority; all three clients remain first-class |
| A-03 | “No developer-operated reproductive-health database” can be read as “no remote copy of any kind” | C2 adds optional E2EE multi-device sync | Preserve the law as “no plaintext/developer-decryptable reproductive-health DB”; optional server may store ciphertext + minimum metadata only |
| A-04 | Existing implementation plan requires no account/operator backend | Core must still require neither, but account mode now exists | Core works without account/sync/network; optional account mode adds E2EE continuity only |
| A-05 | No Web/PWA implementation path | C2 requires Next.js/React/TypeScript Web/PWA | Add a sibling `web/` client rather than converting the Flutter client to Flutter Web |
| A-06 | Old architecture shares Flutter source across Android/iOS only | C2 deliberately uses Dart mobile + TypeScript Web | Add language-neutral `shared/` contracts, schemas, vectors, terminology and conformance tests; semantic parity replaces UI-code reuse as the cross-platform guarantee |
| A-07 | Current traceability is 22/22 family-level | Approved contract is 18 families / 258 atomic requirements | Keep 22-family verifier as mobile-baseline evidence; add 258-ID machine-readable cross-platform traceability before C2 completion is claimed |
| A-08 | Partner V1 is manual/zero-backend | C2 allows future live E2EE sharing | Preserve manual sharing; live partner transport may reuse reviewed E2EE transport only when explicitly enabled |
| A-09 | Public Privacy/Play docs describe current local-only Android behavior | Shipping optional sync will change store/privacy declarations | Keep current `1.0.0+1` statements truthful; require explicit privacy/Data Safety/App Store review before sync is enabled in a release |
| A-10 | CI is mobile-only | C2 requires Web/shared contract gates | Do not weaken existing jobs; add independent shared-contract and Web jobs, then require both for C2 release closure |
| A-11 | Existing Flutter domain/features are already implemented | A rewrite would destroy verified work | Preserve `lib/`, native templates, tests, algorithms, and release workflows; adapt only where shared contract/conformance requires targeted changes |
| A-12 | Browser protection differs from mobile secure hardware | “Equal product” could be misread as identical mechanism | Functional/semantic parity is mandatory; platform security mechanisms are described accurately rather than falsely equated |
| A-13 | Native reminders can schedule locally while Web background behavior varies | Identical delivery guarantees are impossible | Preserve one reminder intent/policy; use adaptive delivery and truthful Reminder Health status per platform |
| A-14 | GitHub Pages is static-only | E2EE identity/sync needs server functionality | GitHub Pages hosts static public site + Web/PWA client; sync/identity is a separate provider-neutral service |
| A-15 | Existing CycleVault uses AES-256-GCM + Argon2id | Web backup interoperability is not yet proved | Do not change mobile format casually; add golden cross-platform CycleVault vectors before claiming interoperability |
| A-16 | Current privacy/scans target Dart/mobile paths | Web introduces URL/cache/service-worker/XSS/session risks | Extend privacy/security scans during implementation; current mobile gates remain release blockers |
| A-17 | First reconciliation draft compressed the 15 September mobile spec/plan | Compression could erase useful historical detail even if semantics were represented elsewhere | Restore the original detailed mobile documents and wrap them with C2 authority/interpretation notices instead of replacing their contents |

## 4. What is NOT being changed by this architecture reconciliation

The following existing production facts remain valid unless a later reviewed implementation change explicitly updates them:

- Android production package `com.sreadya.health.sreadya`.
- Family preview package `com.sreadya.health.sreadya.preview`.
- Flutter mobile code under `lib/`.
- Swift/Kotlin native bridge templates under `platform_templates/`.
- Existing Android and iOS verification workflows.
- Current mobile `1.0.0+1` release line.
- Local prediction and insight processing.
- Existing CycleVault format/crypto until interoperability work proves a compatible evolution.
- Current Google Play privacy/Data Safety position for the currently implemented local-only Android release.
- No production code changes are authorized by this audit alone.

## 5. Documentation authority chain after reconciliation

1. **Cross-platform constitution:** `docs/superpowers/specs/2026-09-16-sreadya-web-product-architecture-design.md`
2. **Cross-platform implementation programme:** `docs/superpowers/plans/2026-09-16-sreadya-c2-cross-platform-implementation.md`
3. **This consistency/preservation audit:** `docs/superpowers/specs/2026-09-16-sreadya-c2-consistency-audit.md`
4. **Preserved mobile baseline specification:** `docs/superpowers/specs/2026-09-15-sreadya-master-design.md`
5. **Preserved historical mobile implementation plan:** `docs/superpowers/plans/2026-09-15-sreadya-v1-implementation.md`
6. Platform release runbooks remain authoritative only for their platform/release channel and must obey the cross-platform constitution.

If documents conflict, higher items in the authority chain win. Lower-level documents retain non-conflicting detail; they are not discarded merely because a higher-level document exists.

## 6. Required implementation gates discovered by the audit

Before any code is called C2-complete:

1. Add machine-readable 258-ID capability registry.
2. Add canonical schemas, terminology, design tokens, prediction/reminder vectors.
3. Add cross-platform conformance verification without deleting existing 22-family mobile evidence.
4. Scaffold the Next.js/React/TypeScript Web/PWA as a sibling client.
5. Implement encrypted browser-local storage before health data is persisted in Web.
6. Reach local account-free Web/PWA feature parity before making account/sync a dependency.
7. Produce a separately reviewed E2EE key/sync protocol before implementing production sync cryptography.
8. Add identity/passkey/trusted-device/recovery flows only after the recovery protocol has test vectors and threat-model tests.
9. Update privacy/store declarations **before** a release actually enables account/sync data flow.
10. Extend CI/security/privacy scans for Web, service workers, shared contracts, and backend code.
11. Preserve capability-level parity evidence for Android, iOS, and Web/PWA.

## 7. Formal planning-log → architecture → implementation crosswalk

The approved planning log contains Sections 0–25. This table records where each decision is preserved and how it reaches implementation. A shorter implementation-task description does not cancel the source requirement; this crosswalk makes the relationship explicit.

| Approved planning area | Preserved architecture home | Implementation ownership | Audit status |
|---|---|---|---|
| 0 Purpose / C2 / amendments / laws | C2 Sections 0, 0.1, 0.2 | Global constraints + every phase | PRESERVED |
| 1 Capability registry: 18 families / 258 launch IDs + 11 future | C2 Section 1 | Tasks 1 and 25; capability IDs used throughout | PRESERVED |
| 2 Visual design system | C2 Section 2 | Tasks 4, 6, 15, 27 | PRESERVED |
| 3 Navigation / responsive behavior | C2 Sections 3 and 15 | Task 6 + E2E/a11y checks | PRESERVED |
| 4 Local encrypted browser vault | C2 Section 4 | Tasks 8–10, 14, 16 | PRESERVED |
| 5 E2EE account/sync | C2 Sections 5, 17, 18 | Hard gate Task 19, then Tasks 20–24 | PRESERVED |
| 6 Authentication / recovery | C2 Section 6 | Tasks 21 and 23 | PRESERVED |
| 7 PWA / offline / adaptive reminders | C2 Section 7 | Tasks 7, 12, 18 | PRESERVED |
| 8 Shared contract / conformance | C2 Sections 8, 13, 14 | Tasks 1–4, 11–14, 19, 24, 25 | PRESERVED |
| 9 Repository / deployment architecture | C2 Sections 9 and 22 | Tasks 5, 17, 20, 26, 27 | PRESERVED |
| 10 Error handling / recovery states | C2 Section 10 | Tasks 8, 14, 16, 22, 23, 27 | PRESERVED |
| 11 QA / security / accessibility | C2 Section 11 | Tasks 15–18 and 25–28 | PRESERVED |
| 12 Cross-platform parity matrix | C2 Section 12 | Tasks 25 and 28 | PRESERVED |
| 13 Authoritative shared-core law | C2 Section 13 | Tasks 1–4, 11–14, 19, 24, 25 | PRESERVED |
| 14 Platform-adapter law | C2 Section 14 | Tasks 12, 24, 28 | PRESERVED |
| 15 Public site / private workspace routes | C2 Section 15 | Task 6 route shells/navigation | PRESERVED |
| 16 Privacy Center | C2 Section 16 | Task 13 local state; Tasks 23–24 add account/device/sync truth | PRESERVED |
| 17 Account-mode equality | C2 Section 17 | Global constraints; Tasks 10, 18, 21, 23, 24 | PRESERVED |
| 18 Data ownership | C2 Section 18 | Tasks 8, 20, 22, 24 | PRESERVED |
| 19 Medical/regulatory boundary | C2 Section 19 | Task 4 policy contract, Tasks 13, 26, 27 | PRESERVED |
| 20 Definition of Done | C2 Section 20 | Tasks 25, 27, 28 | PRESERVED |
| 21 Design-freeze rule | C2 Section 21 | Global constraints and approval gates | PRESERVED |
| 22 Monorepo target | C2 Section 22 | Tasks 1, 5, 20 | PRESERVED |
| 23 Build-order principle | C2 Section 23 | Phases A–G / Tasks 1–28 | PRESERVED |
| 24 Final architecture statement | C2 Section 24 | Plan goal and final acceptance | PRESERVED |
| 25 Approved design status | C2 Section 25 | Implementation remains blocked until explicit user approval | PRESERVED |

## 8. Subtle approved details checked explicitly

The broad section crosswalk was not considered sufficient by itself. The audit also checked details that are easy to lose during summarization. They remain requirements of the corresponding C2 sections/tasks:

- **Design/UX:** public Sreadya may be expressive but the health workspace is calm; semantic colors are contrast-tested; colour is never the sole state signal; destructive actions are separated and require confirmation; motion explains state and obeys reduced-motion settings; charts have textual summaries/labels/units rather than colour-only meaning.
- **Navigation/responsiveness:** the primary mobile/PWA navigation stays intentionally small (Home/Today/Log/Calendar/More); browser back/forward/refresh/deep links are respected; ultra-wide layouts remain readable rather than stretching health content merely because space exists.
- **Browser vault:** no plaintext health values in `localStorage`, URL state, indexes, or service-worker caches; application-layer encryption precedes persistence; persistent/durable storage is requested where appropriate; users are warned that browser-site-data clearing can destroy a local-only vault; CycleVault remains available.
- **Recovery:** email/phone/both are account identifiers, phone is optional, passkeys are preferred, trusted-device approval is primary for new devices, a user-held recovery key restores vault access when devices are lost, and email/SMS alone cannot decrypt old history. Recovery-key UX must support safe user-controlled storage/export methods without creating a server-held decryption copy.
- **Deployment environments:** development/staging/production are treated as separate environments when backend deployment begins. Real production reproductive-health records are never copied into test/staging; automated tests use synthetic or explicitly created test data.
- **Failure/recovery:** safe/read-only recovery preserves data when integrity is uncertain and exposes repair, encrypted export/backup, and sanitized diagnostics rather than silently resetting or overwriting health history.
- **Security/QA:** WCAG 2.2 AA, browser/device/zoom/keyboard/screen-reader/RTL testing, XSS/service-worker/session/replay/recovery-abuse threat cases, SAST/dependency/SBOM/license/secret checks, and wife-alpha followed by broader worldwide usability testing remain release work, not optional polish.

These details are implementation constraints, not a competing architecture. If a task summary is shorter than this list, the task inherits the relevant constraint through this crosswalk and the C2 constitution.

## 9. Legacy-value preservation check

A diff review found that the first reconciliation draft compressed the original 15 September mobile specification and task plan. That was corrected before merge:

- `2026-09-15-sreadya-master-design.md` now retains the original detailed 22 capability families, screen map, domain invariants, exact Prediction v1 algorithm, reminder state machine, key lifecycle, logging policy, and signing boundary, with C2 interpretation/precedence notices added around them.
- `2026-09-15-sreadya-v1-implementation.md` now retains the original 16-task files/interfaces/test/commit checklist in full, with C2 preservation/status notes and a forward handoff added around it.
- The C2 constitution does **not** delete the mobile algorithms or test requirements; it promotes their behavior into shared cross-platform schemas/vectors where applicable.

Therefore the cross-platform plan extends the existing verified product rather than replacing valuable prior engineering history with a shorter retelling.

## 10. Audit conclusion

The uploaded planning log and the repository C2 constitution/programme describe the same approved architecture: **C2 Web-Native Monorepo, three equal first-class clients, full account-free Sreadya, optional E2EE continuity, local plaintext authority, passkey/trusted-device/recovery-key boundaries, adaptive reminders, shared language-neutral contracts, and 258-ID anti-drift closure.**

No approved launch capability family or approved Section 0–25 architectural area is left without an architecture home and an implementation owner. Future/optional `FUT-*` capabilities remain explicitly future rather than being accidentally promoted to launch promises.

Provider/product choices that the approved design intentionally leaves for a later reviewed gate—such as the production email/SMS vendor and production sync deployment provider—remain deliberately unselected; the implementation plan must not invent them prematurely.

**Audit status: COMPLETE FOR DOCUMENTATION/PLANNING RECONCILIATION.** This status does not claim that the future Web/account/sync implementation already exists. It authorizes merge of the documentation programme only after fresh CI is green for the final branch head. Phase A remains blocked until explicit user approval after merge/cleanup proof.
