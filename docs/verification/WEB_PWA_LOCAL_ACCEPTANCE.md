# Sreva Web/PWA Local Acceptance — Task 18

**Status:** FORMALLY CLOSED FOR IMPLEMENTATION — desktop/live-production acceptance is green; two physical iPhone field observations are explicitly deferred and remain pending

**Task-17 closure baseline:** `79359d0ea10730c4301f4147706184371f7ddc4c`

**Current Task-18 branch head before the closure decision:** `a4f6dd70e9e6987b0e8777f33047338893be62b3`

**Live production URL:** `https://girish2052003.github.io/sreva-womens-health/`

This evidence file tracks the wife PWA acceptance milestone for the local/account-free Sreva Web/PWA experience. No criterion is marked accepted unless there is direct evidence for that criterion. Synthetic test data only is used in automated acceptance.

## Deployment and technical baseline

- [x] Final Task-17 Sreva CI completed successfully on the closure baseline.
- [x] Final Task-17 dedicated Task 5–16 verification workflows completed successfully on the closure baseline.
- [x] GitHub Pages static build workflow completed successfully on the closure baseline.
- [x] GitHub Pages artifact was produced successfully for the project-path static export.
- [x] PR-side deployment is intentionally skipped; feature branches cannot publish the production Pages site.
- [x] Web privacy scan, secret scan, dependency audit, and Web SBOM generation passed on the closure baseline.
- [x] Cross-browser navigation/accessibility/PWA CI proof passed on the closure baseline.
- [x] Local encrypted browser-vault and CycleVault browser verification passed on the closure baseline.
- [x] Task-17 closure baseline was promoted to `main` as a fast-forward with no force and no history rewrite.
- [x] Task-17 PR #5 is recorded by GitHub as merged at the exact closure SHA.
- [x] Main-branch Pages build job `105012920402` in run `35161459652` completed successfully and uploaded the `github-pages` artifact.
- [x] GitHub Pages was enabled with GitHub Actions as the deployment source.
- [x] The Pages deployment was retried successfully and the public HTTPS site is reachable at the production URL above.

The former Pages HTTP-404 condition was a repository Pages-enable setting gate. It is closed and MUST NOT be treated as a current Task-18 blocker.

## Dedicated live-production acceptance evidence

Dedicated workflow: `.github/workflows/c2-task18-live-acceptance.yml`

Production test: `web/e2e/task18-live-acceptance.spec.ts`

Latest exact-head proof:

- Workflow run: `35162519440`
- Job: `105016278370` (`live-desktop-acceptance-preflight`)
- Head: `98195fae5b0502dd45c4a8bdc713a34472d943ea`
- Conclusion: **SUCCESS**
- Production acceptance step: **SUCCESS**
- Test target: the public GitHub Pages HTTPS deployment, not a local development server

The live test also verifies the PWA manifest (`name=Sreva`, `display=standalone`, project-path `start_url`/`scope`) and waits for the production service worker before entering the account-free workspace.

## Required Task-18 acceptance

The original acceptance text requested an iPhone using Safari / Add to Home Screen plus a desktop browser. The desktop/live-production portion is complete. On 17 September 2026, the product owner explicitly authorized the implementation milestone to close and subsequent C2 work to proceed while the two physical-iPhone observations are deferred to field acceptance.

This is a governance decision, **not** evidence that the physical checks passed. The unchecked observations remain visible below and MUST NOT be described as completed until directly observed.

### Physical iPhone observations — deferred field acceptance, still pending

- [ ] Install/open the PWA on a real iPhone from the deployed HTTPS site using Safari → Add to Home Screen.
- [ ] Reopen the installed PWA from the real iPhone Home Screen and confirm it opens in standalone installed-app form.

These two checks are intentionally not replaced by desktop emulation or CI. They require direct observation on the target physical device. They are carried forward as a field-acceptance obligation and must be recorded here when performed.

### Live production desktop/account-free flow — accepted

- [x] Open the deployed production site in Chromium through the dedicated live acceptance workflow.
- [x] Use the public **Continue without an account** entry and reach `/app/home/` without a sign-in requirement.
- [x] Confirm the encrypted local vault is usable and persists across reload.
- [x] Add four synthetic historical periods.
- [x] Verify prediction most-likely date, expected range/window, confidence, and truthful estimate/non-diagnosis wording.
- [x] Configure a **3 days before** reminder in Balanced mode, save it locally/encrypted, verify truthful closed-app-delivery boundary, reload, and confirm the setting persists.
- [x] Exercise local logging with a synthetic private note.
- [x] Exercise Today.
- [x] Exercise Calendar/history including the timeline view.
- [x] Exercise Insights and confirm browser-local calculation wording.
- [x] Preview a report and download the generated CSV.
- [x] Exercise the Privacy Center and confirm the platform-health boundary is reported as **Not connected**.
- [x] Confirm no user-facing HealthKit connected/enabled/synced claim appears in the PWA acceptance flow.
- [x] Export an encrypted CycleVault backup using a synthetic passphrase.
- [x] Select the exported CycleVault file and restore it locally with explicit replacement acknowledgement.
- [x] Reload the local workspace after restore and confirm the encrypted local vault remains usable.
- [x] Put the production page offline, reload it, and confirm the Home workspace and encrypted local vault reopen successfully.
- [x] Inspect Cache Storage URLs/bodies for the synthetic private-note and historical-period sentinels and confirm they are absent.
- [x] Inspect all observed request URLs and request bodies for those sensitive sentinels and confirm they are absent.
- [x] Confirm every observed request stays on the deployed Sreva origin during the acceptance flow.

## Closure boundary

Task 18 is formally closed for implementation and automated/live-production acceptance by explicit product-owner decision dated 17 September 2026. No additional Task-18 coding is required to begin Task 20 or later C2 implementation.

The two physical-iPhone observations above remain **PENDING** and are not waived as facts. They are deferred to field acceptance and must be completed before Sreva claims real-iPhone PWA installation/standalone acceptance. When they are observed, record device/browser, date, and result here without rewriting the historical closure decision.

Account/sync work must not be used as evidence for those physical-device checks.
