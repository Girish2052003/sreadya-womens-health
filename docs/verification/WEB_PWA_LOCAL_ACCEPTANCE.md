# Sreva Web/PWA Local Acceptance — Task 18

**Status:** IN PROGRESS

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

The Task-17 Pages workflow is present and its PR-side static build is green. A live production Pages URL is required before the iPhone Safari/Add-to-Home-Screen portion of this milestone can be accepted. Production deployment must come from the reviewed main-branch path; this evidence file does not bypass that gate.

## Closure rule

Task 18 remains **IN PROGRESS** until every required acceptance item above has direct evidence. Account/sync work must not be used to block or substitute for this local/account-free milestone.
