# Sreva C2 Cross-Platform Consistency Audit

**Date:** 16 September 2026  
**Branch:** `docs/c2-cross-platform-alignment`  
**Authoritative design:** `docs/superpowers/specs/2026-09-16-sreva-web-product-architecture-design.md`  
**Audit basis:** approved Sreva website-planning maintenance log + repository state at `main` commit `9c228f873fa74944896118a53205a117e50ed7c7`.

## 1. Audit objective

Reconcile the existing Flutter/mobile plans and public documentation with the approved C2 architecture without weakening the C2 decision. The repository must tell one coherent story:

> **One Sreva, three first-class clients — Android, iOS, Web/PWA — with the same health semantics, privacy philosophy, capability contract, and conformance rules.**

Existing Flutter code is treated as the mature mobile baseline, not a competing architecture. New Web/PWA and optional E2EE continuity extend that baseline through shared contracts.

## 2. Repository facts confirmed

- `main` is currently a Flutter/Dart mobile codebase with Android/iOS native adapters generated from `platform_templates/`.
- Current mobile release line is `1.0.0+1`.
- Android package identity is `com.sreva.health.sreva`; family preview uses `com.sreva.health.sreva.preview`.
- Existing `lib/` already contains feature-oriented mobile modules for cycle, predictions, reminders, logging, life stages, insights, reports, backup, privacy, diagnostics, partner sharing, assistant, and health integration.
- Existing CI verifies Flutter core, Android production/family-preview paths, and iOS no-codesign compilation.
- `tool/verify_v1_traceability.py` currently closes 22 broad mobile capability families against implementation/evidence.
- No Next.js/React Web client, Web/PWA vault, passkey account system, trusted-device recovery, or E2EE sync service exists in the repository yet.

## 3. Conflicts found and authoritative resolutions

| ID | Existing state | Conflict with approved C2 | Resolution |
|---|---|---|---|
| A-01 | Old master spec lists only iOS and Android | Web/PWA is now a first-class client | New C2 spec is authoritative; old master becomes the mobile-baseline companion and points to C2 |
| A-02 | Old master says primary launch device iPhone 17 | README/current release engineering says Android is first production-distribution priority; PWA is now the immediate iPhone alternative | Remove product-wide “primary device” authority. Android remains current native distribution priority; iOS remains first-class; PWA provides first-class iPhone Web installation while native App Store signing is unavailable |
| A-03 | “No developer-operated reproductive-health database” can be read as “no remote copy of any kind” | C2 adds optional E2EE multi-device sync | Preserve core law as “no plaintext/developer-decryptable reproductive-health DB”; optional server may store ciphertext + minimum metadata only |
| A-04 | Existing implementation plan requires no account/operator backend | Core must still require neither, but account mode now exists | Reword as “core works without account/sync service/network”; optional account mode adds E2EE continuity only |
| A-05 | No Web/PWA implementation path | C2 requires Next.js/React/TypeScript Web/PWA | Add a parallel `web/` client rather than converting the Flutter client to Flutter Web |
| A-06 | Old architecture depends on shared Flutter source for Android/iOS only | C2 deliberately uses Dart mobile + TypeScript Web | Create language-neutral `shared/` contracts, schemas, vectors, terminology and conformance tests; semantic parity replaces UI-code reuse as the cross-platform guarantee |
| A-07 | Current traceability is 22/22 family-level | Approved contract is 18 families / 258 atomic requirements | Keep 22-family verifier as mobile-baseline evidence until implementation phase; extend/replace with 258-ID machine-readable cross-platform traceability before C2 features are called complete |
| A-08 | Partner V1 is manual/zero-backend | C2 allows future live E2EE sharing | Preserve manual sharing; live partner transport may reuse reviewed E2EE transport only when explicitly enabled |
| A-09 | Public Privacy/Play docs describe current local-only Android behavior | Shipping optional sync will change store/privacy declarations | Keep current statements truthful for current `1.0.0+1`; add an explicit release gate requiring policy/Data Safety review before sync is enabled in a store release |
| A-10 | CI is mobile-only | C2 requires Web/shared contract gates | Do not weaken existing jobs; implementation plan adds independent shared-contract and Web jobs, then makes release closure depend on both |
| A-11 | Existing Flutter domain/features are already implemented | A rewrite would create risk and destroy verified work | Preserve current `lib/`, `platform_templates/`, tests and release workflows; adapt only where shared contract/conformance requires targeted changes |
| A-12 | Browser security differs from mobile secure hardware | “Equal product” could be misread as identical mechanism | Functional parity is mandatory; security UI must state platform-specific protection accurately. Web uses WebCrypto/WebAuthn/browser storage, native uses Keystore/Keychain |
| A-13 | Native reminders can schedule locally while Web background behavior varies | Identical delivery guarantees are impossible | Preserve one reminder intent/policy; use adaptive delivery and honest Reminder Health status per platform |
| A-14 | GitHub Pages is static-only | E2EE identity/sync needs server functionality | GitHub Pages hosts static public site + Web/PWA client; sync/identity is a separate provider-neutral service |
| A-15 | Existing CycleVault uses AES-256-GCM + Argon2id | Web backup interoperability is not yet proved | Do not change mobile format casually. Add golden cross-platform CycleVault vectors before claiming Web ↔ mobile backup compatibility |
| A-16 | Current privacy/scans target Dart/mobile paths | Web introduces URL/cache/service-worker/XSS/session risks | Extend privacy/security scans during implementation; current gates remain release blockers for mobile |

## 4. What is NOT being changed by this architecture reconciliation

The following existing production facts remain valid unless a later reviewed implementation change explicitly updates them:

- Android production package `com.sreva.health.sreva`.
- Family preview package `com.sreva.health.sreva.preview`.
- Flutter mobile code under `lib/`.
- Swift/Kotlin native bridge templates under `platform_templates/`.
- Existing Android and iOS verification workflows.
- Current mobile `1.0.0+1` release line.
- Local prediction and insight processing.
- Existing CycleVault format/crypto until interoperability work proves a compatible evolution.
- Current Google Play privacy/Data Safety position for the currently implemented local-only Android release.
- No production code changes are authorized by this audit alone.

## 5. Documentation authority chain after reconciliation

1. **Cross-platform constitution:** `docs/superpowers/specs/2026-09-16-sreva-web-product-architecture-design.md`
2. **Mobile baseline companion:** `docs/superpowers/specs/2026-09-15-sreva-master-design.md`
3. **Cross-platform implementation program:** `docs/superpowers/plans/2026-09-16-sreva-c2-cross-platform-implementation.md`
4. **Mobile baseline implementation record:** `docs/superpowers/plans/2026-09-15-sreva-v1-implementation.md`
5. Platform release runbooks remain authoritative only for their platform/release channel and must obey the cross-platform constitution.

If documents conflict, higher items in the authority chain win.

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

## 7. Audit conclusion

The existing Flutter/mobile implementation is **compatible with C2** and should not be rewritten. The main inconsistency was documentation scope: the old master design and implementation plan were mobile-only and used wording that could prohibit the newly approved optional ciphertext sync layer.

The coherent model is now:

```text
Existing Flutter Android/iOS implementation
                │
                ├──────────────┐
                │              │
                ▼              ▼
        shared contracts   Next.js Web/PWA
                │              │
                └──────┬───────┘
                       ▼
              conformance suite
                       │
                       ▼
      optional reviewed E2EE continuity
```

**Audit status: architecture conflicts identified and resolvable without weakening the approved C2 design.**
