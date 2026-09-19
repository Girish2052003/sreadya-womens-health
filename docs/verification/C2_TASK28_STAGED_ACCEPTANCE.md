# C2 Task 28 — Final Wife-Alpha and Staged Product Acceptance

**Repository status:** PREPARED / EXTERNAL ACCEPTANCE PENDING  
**Task-27 baseline:** `e04a7774b1de8f20913a03ccacf0fb5f9491b41d`  
**Release state:** `blocked_external_acceptance`

## Purpose

Task 28 is the final C2 roadmap task. The approved order is:

1. Web/PWA wife alpha
2. Android wife alpha/regression
3. iOS native verification / distribution when signing exists
4. multi-device E2EE acceptance
5. small private beta
6. staged production

The repository can prove preflight quality and enforce release blockers. **Repository preflight is not human acceptance.** CI must never claim that wife alpha, real-device multi-device use, private beta, iOS signing/distribution, or staged production happened when they did not.

## Repository implementation-parity amendment — 19 September 2026

The shared Flutter client now exposes Account & continuity, Encrypted sync, Trusted devices and Recovery workspaces from the mobile More hub. The Task-25 evidence ledger traces mobile ID/SYNC requirements through those user-facing surfaces in addition to the existing native passkey and E2EE adapters.

This closes the repository-level mobile continuity navigation/surface gap. It does **not** convert any external Task-28 stage to accepted. Real-device wife-alpha, signed iOS distribution, real multi-device E2EE acceptance, private beta and staged production still require genuine external evidence.

## Product-equality acceptance rule

Task 28 checks user-visible equality rather than pixel identity. The acceptance dimensions are terminology, data, predictions, privacy, reports, reminders, life-stage behavior, recovery semantics and sync results. Platform-native integrations may differ only where that difference is documented and consistent with the approved cross-platform capability ledger.

The machine-readable source for this Task-28 state is `shared/acceptance/task28-acceptance.v1.json`.

## Production stop rule

**No production rollout** is allowed if any privacy, migration, reminder, recovery, ciphertext-authorization or data-loss gate is red.

Repository evidence for those gates remains additive to all stronger Task 19-27 workflows. Task 28 does not replace or weaken any earlier gate.

## External acceptance sequence

| Stage | Current state | What repository CI may prove | What remains external |
| --- | --- | --- | --- |
| Web/PWA wife alpha | `external_pending` | local/live acceptance automation, PWA/offline/privacy regressions | wife alpha observation on a real browser/device |
| Android wife alpha/regression | `external_pending` | Android regression/signing verification | wife alpha observation on the real Android build |
| iOS native distribution | `external_pending` | iOS no-codesign compile and native adapter verification | **iOS signing**, distribution and real-device acceptance |
| Multi-device E2EE acceptance | `external_pending` | protocol vectors, auth/replay/revocation/recovery tests | real-device multi-client acceptance |
| Private beta | `external_pending` | repository release gates | actual private beta with human testers |
| Staged production | `blocked` | exact-build release checks | store/operator authorization and staged rollout |

## Evidence hygiene

External acceptance evidence must be sanitized. Record build SHA, date, platform/device class, scenarios exercised and pass/blocker disposition. Do **not** commit screenshots, logs, exports, backups or notes containing personal reproductive-health information.

Task-28 CI uses synthetic fixtures only. **No real health data** belongs in repository tests, CI logs or committed acceptance evidence.

A wife-alpha acceptance receipt should therefore say that the required flows were exercised and whether blockers were observed; it should not contain health values.

## Real-device wife-alpha checklist

For Web/PWA and Android, exercise the same product promise rather than matching pixels:

- open Sreadya without an account and confirm the health feature set remains complete;
- log synthetic or user-controlled data locally and confirm persistence;
- check predictions/confidence wording and non-diagnostic safety language;
- configure reminders and verify privacy wording;
- review insights/reports and encrypted backup/restore behavior;
- review Privacy Center and device/account controls;
- exercise offline/reconnect behavior without silent loss;
- where account mode is intentionally enabled, confirm E2EE/recovery semantics and that identity recovery does not bypass vault recovery.

Any privacy, migration, reminder, recovery, ciphertext-authorization or data-loss failure is a release blocker.

## iOS boundary

Current repository proof includes iOS no-codesign compilation and native adapter verification. That is not App Store or device distribution evidence. The iOS stage remains `external_pending` until signing exists and a signed build is actually accepted on a real device/distribution path.

## Multi-device E2EE boundary

Automated protocol, ciphertext API, trusted-device, revoked-device, replay and recovery tests are repository preflight. Task 28 still requires a real-device multi-client acceptance receipt before this external stage can move from `external_pending` to `accepted`.

## Private beta and staged production

A private beta is a human testing event, not a CI result. Record only sanitized metadata: build SHA, tester count, supported platform mix, blocker count and disposition.

Staged production remains blocked until every prior external stage is accepted with genuine evidence and the exact shipping binaries/dependencies receive their required store/compliance review.

## Transition rule

The verifier in `tool/verify_task28_acceptance.py` fails closed. It rejects an accepted external stage without evidence and **cannot mark production ready** while any required external stage remains pending. The current repository therefore intentionally remains `blocked_external_acceptance`.

When real external acceptance occurs, add sanitized evidence references and change only the corresponding stage state. Do not change production readiness first.
