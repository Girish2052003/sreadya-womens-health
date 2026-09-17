# C2 Cross-Platform Release Closure — Task 27

**Status:** CANDIDATE EVIDENCE RECORDED — final branch closure requires this updated ledger SHA itself to reproduce the dedicated Task-27 and full Sreva CI success before merge.  
**Task-26 baseline:** `b239fd251bbba92aa62aab33a2c64ca47fa7ba70`  
**Verified pre-ledger Task-27 candidate:** `492edf9029b929b7f65d68999df9288022af2680`  
**Date:** 18 September 2026

## Scope

Task 27 is the security, accessibility, performance and recovery hardening gate for the already-implemented C2 cross-platform product. It does not add a new product mode or weaken the account-free, E2EE, recovery, privacy or 258-ID cross-platform contracts.

## Security

The release candidate retains the existing privacy/secret/dependency/SBOM gates and adds focused sync race/fuzz/adversarial evidence for authorization isolation, concurrent same-object writes, revoked devices and replay/idempotency. Web XSS, CSP, service-worker, Cache Storage, clickjacking, CSRF and malicious-browser-extension boundaries are reviewed in `docs/security/C2_TASK27_WEB_SECURITY_REVIEW.md`.

On candidate `492edf9029b929b7f65d68999df9288022af2680`:

- dedicated Task-27 run **35284999157** completed successfully;
- Go race/adversarial tests completed successfully;
- bounded `FuzzTask27SyncEnvelope` completed successfully after **24,414 executions** in the observed run;
- privacy/secret scan passed;
- the locked Web dependency audit reported **0 vulnerabilities**.

## Accessibility

The target remains **WCAG 2.2 AA**. Existing keyboard focus, 200%/large-text, reduced-motion, high-contrast and RTL checks remain in force. Task 27 adds Axe-based checks across critical public/private routes, a 44×44 CSS-pixel primary touch-target check, status-announcement evidence and the existing three-browser Playwright matrix.

On candidate `492edf9029b929b7f65d68999df9288022af2680`, the dedicated Web hardening job completed successfully with **22 passing Playwright checks** across Chromium, Firefox and WebKit. The service-worker Cache Storage assertion is intentionally Chromium-only because that introspection path is made deterministic there; those corresponding non-Chromium cases are skipped rather than represented as executed.

Manual engineering review checks the same contract at source/interaction level; physical assistive-technology and wife-alpha observations remain external product-acceptance evidence rather than being fabricated by repository CI.

## Performance

`web/performance-budget.json` freezes deterministic static-output budgets for total export size, public HTML, app-shell HTML and largest static asset. `tool/verify_web_performance_budget.py` measures the actual production static export and fails closed when a budget is exceeded.

Observed candidate measurements:

| Metric | Measured | Frozen budget | Result |
| --- | ---: | ---: | --- |
| Total static bytes | 3,260,995 | 6,291,456 | PASS |
| Largest public HTML bytes | 23,701 | 262,144 | PASS |
| Largest app-shell HTML bytes | 15,135 | 393,216 | PASS |
| Largest static asset bytes | 430,343 | 1,572,864 | PASS |

These byte budgets are reproducible repository evidence; they are not represented as synthetic Lighthouse or field-network timings.

## Recovery and offline resilience

Task 27 adds synthetic corruption drills for truncated/corrupt/future-schema CycleVault input and staged rollback. The Web sync queue is also exercised across a synthetic 30-day offline interval and reconnect to prove **no silent loss** of queued ciphertext or cursor state.

On candidate `492edf9029b929b7f65d68999df9288022af2680`, the dedicated mobile-recovery job reported **4 tests passed**, with the Dart formatter guard also reporting **0 changed**.

## Synthetic-data rule

All Task-27 fixtures use synthetic identifiers, dates and opaque ciphertext. **No real health data** is used in tests, logs, closure evidence or CI artifacts.

## Full candidate regression evidence

For `492edf9029b929b7f65d68999df9288022af2680`:

- dedicated Task-27 workflow run **35284999157**: **completed / success**, all 5 jobs green;
- full Sreva CI run **35284999364**: **completed / success**, all 8 jobs green;
- C2 Task 25 Cross-Platform Traceability: success;
- C2 Task 26 Sync Release Policy: success;
- Sreva Web Pages: success;
- every workflow run returned for this exact candidate SHA — **23 total** — completed with conclusion **success**.

The full Sreva CI candidate matrix includes shared contracts, Flutter/reference/security work, Web core/security/E2E, iOS no-codesign release compilation, signed Android production verification and signed Android family-preview verification.

## External boundaries

External store-console declarations, production-provider accounts, physical-device assistive-technology observations, third-party penetration testing and independent cryptographic audit remain external evidence. Repository CI does not claim those actions occurred.

## Formal merge rule

This document update creates a new branch SHA. Task 27 is not formally closed merely because the pre-ledger candidate above passed. Before PR #16 is eligible to merge, the exact updated branch head must again pass the frozen Task-27 contract, dedicated Task-27 workflow and complete Sreva CI/regression matrix. After squash merge, the resulting `main` SHA must receive fresh push-triggered Task-27 and full Sreva CI success before Task 27 is stamped **FORMALLY CLOSED**.
