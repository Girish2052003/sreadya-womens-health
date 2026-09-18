# Sreadya Web Final Product-Completeness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the deployed Web/PWA from deployment-complete to product-complete against the frozen 258-ID Sreadya launch contract.

**Architecture:** Preserve the existing Next.js/React local-first client and encrypted vault. Add a complete feature-discovery layer, finish shell workspaces with real encrypted local interactions, connect platform/account/sync state truthfully, and replace family-only traceability with a 258-ID Web surface ledger.

**Tech Stack:** Next.js, React, TypeScript, IndexedDB/Dexie, WebCrypto, Playwright, Vitest, Python reference verifiers.

**Spec:** `docs/superpowers/specs/2026-09-18-sreadya-web-final-product-completeness-design.md`

## Global Constraints

- The existing 258 launch IDs remain authoritative.
- The 11 `FUT-*` capabilities remain future/optional unless explicitly promoted by a new architecture amendment.
- Account-free Sreadya remains a complete first-class health experience.
- Health plaintext must not be added to URLs, analytics, service-worker caches or ordinary logs.
- Browser/PWA behavior must be truthful about native-only and provider-dependent capabilities.
- No placeholder, TODO, coming-soon or shell copy may remain in production Web source.
- Every interactive-looking control must have a real user task.
- TDD red → green is required for each closure task.

---

## Task 1 — Freeze product-completeness red contracts

- [ ] Add `verification/reference/test_web_product_completeness.py`.
- [ ] Assert `More` routes to a real feature hub.
- [ ] Assert Back control and branded home action exist.
- [ ] Assert former shell routes use dedicated workspaces.
- [ ] Assert account/devices/recovery/sync routes use interactive status workspaces, not static cards.
- [ ] Assert release backlog scan includes `web/src`.
- [ ] Assert a 258-ID Web surface ledger exists and is exact.
- [ ] Run the new verifier and record the expected RED failure.

## Task 2 — Navigation, feature hub and no-dead-control closure

- [ ] Add reusable workspace header/back control.
- [ ] Add `/app/more` complete feature hub.
- [ ] Make the S mark a clear workspace-home action.
- [ ] Make every private area reachable from normal navigation.
- [ ] Add Playwright tests for back, logo/home and complete feature-hub navigation.
- [ ] Verify green.

## Task 3 — Structured health logging closure

- [ ] Add reusable encrypted observation workspace primitives.
- [ ] Finish Symptoms, Wellness, Medication and Reproductive Health routes.
- [ ] Add severity, value/unit, flow/test/context fields where appropriate.
- [ ] Preserve local-only encrypted persistence and deletion/edit semantics.
- [ ] Add component/E2E evidence.
- [ ] Verify green.

## Task 4 — Prediction, reminders and insights user-story closure

- [ ] Expose full prediction explanation and applicable reproductive estimates.
- [ ] Expose prediction history/accuracy state without fabricated data.
- [ ] Add personal reminder intents and snooze/action semantics where browser-adapted behavior permits.
- [ ] Expand insights to the required trend families and provenance.
- [ ] Add focused tests.
- [ ] Verify green.

## Task 5 — Settings, diagnostics, privacy and data-control closure

- [ ] Turn Settings into the complete settings/index surface.
- [ ] Add Diagnostics workspace with preview/download of sanitized technical state.
- [ ] Expose individual-record/data/export/permission/partner/device review links in Privacy Center.
- [ ] Keep native-only protection wording truthful on Web.
- [ ] Verify green.

## Task 6 — Account, recovery, devices and sync UI closure

- [ ] Build user-action workspaces around reviewed passkey/recovery/device/sync adapters.
- [ ] Make deployment/provider availability explicit.
- [ ] Never fake server/account state when production service is not configured.
- [ ] Preserve full account-free health feature equality.
- [ ] Add tests for unavailable/configured-state rendering and safe actions.
- [ ] Verify green.

## Task 7 — Public site and 258-ID capability catalogue

- [ ] Replace the generic Features template with a complete capability catalogue.
- [ ] Group all 258 launch IDs by family.
- [ ] Link interactive capabilities into their real workspace homes.
- [ ] Mark platform-adapted/native-only/provider-dependent behavior clearly.
- [ ] Keep 11 future capabilities separate and not marketed as launch-complete.
- [ ] Add public navigation to Security, Help and Download as specified.
- [ ] Verify accessibility and deep links.

## Task 8 — Evidence v2 and release gates

- [ ] Create/generate the 258-ID Web surface ledger.
- [ ] Verify every row has a route, surface type, implementation and evidence.
- [ ] Extend release backlog scan to `web/src`.
- [ ] Add no-shell/no-dead-control release checks.
- [ ] Run full Web tests/build.
- [ ] Run reference/shared verification.
- [ ] Run full CI on the branch.
- [ ] Code-review the complete branch.
- [ ] Merge only after green review.
- [ ] Verify exact merged SHA across Tasks 25–28 and Sreadya CI.
- [ ] Verify Pages deploy + post-deploy live acceptance.
