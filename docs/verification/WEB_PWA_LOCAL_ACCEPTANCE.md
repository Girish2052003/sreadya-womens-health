# Sreva Web/PWA Local Acceptance — Task 18

**Status:** IN PROGRESS — deployment blocked only by repository Pages enablement

**Task 17 closure baseline:** `79359d0ea10730c4301f4147706184371f7ddc4c`

This evidence file tracks the wife PWA acceptance milestone for the local/account-free Sreva Web/PWA experience. No criterion is marked accepted unless there is direct evidence for that criterion.

## Pre-acceptance technical baseline

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
- [ ] Main-branch Pages deployment succeeds and exposes the live HTTPS site.

## Current deployment blocker

Main-branch Pages deployment job `105013047207` in run `35161459652` reached `actions/deploy-pages` with the correct artifact and `pages: write` permission, then GitHub returned HTTP 404 with the explicit message:

> Ensure GitHub Pages has been enabled.

This is a repository setting gate, not a Sreva build, routing, privacy, or artifact failure. The GitHub connector available to this workflow does not expose the authenticated repository Pages-enable mutation.

Required repository setting before retry:

1. Open the repository on GitHub.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Preserve the existing least-privilege workflow; do not add health/sync/provider secrets to Pages.
5. Re-run the failed Pages deployment after the setting is enabled.

## Required Task-18 acceptance

Acceptance must be exercised on an iPhone using Safari / Add to Home Screen and on a desktop browser.

- [ ] Install/open the PWA on iPhone from the deployed HTTPS site.
- [ ] Reopen the installed PWA from the iPhone Home Screen.
- [ ] Open the site in the selected desktop browser.
- [ ] Continue privately with no account.
- [ ] Add historical periods.
- [ ] Verify prediction, prediction window, and confidence presentation.
- [ ] Configure a 3-day reminder and verify truthful Reminder Health status.
- [ ] Exercise Today, logging, calendar, and history.
- [ ] Exercise insights.
- [ ] Preview and export a report.
- [ ] Export and restore CycleVault.
- [ ] Exercise Privacy Center controls/information.
- [ ] Verify offline use and reopen behavior.
- [ ] Confirm the PWA makes no HealthKit claim.
- [ ] Confirm no sensitive health payload appears in URLs, Cache Storage, or network request metadata during the acceptance flow.

## Deployment gate

The Task-17 Pages workflow is present. Its feature-branch static build is green, and the same static build is green after promotion to `main`. The main deployment currently fails only because GitHub Pages is not enabled for this repository. A live production Pages URL is required before the iPhone Safari/Add-to-Home-Screen portion of this milestone can be accepted. Production deployment must come from the reviewed main-branch path; this evidence file does not bypass that gate.

## Closure rule

Task 18 remains **IN PROGRESS** until every required acceptance item above has direct evidence. Account/sync work must not be used to block or substitute for this local/account-free milestone.
