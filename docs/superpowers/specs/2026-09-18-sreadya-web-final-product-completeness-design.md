# Sreadya Web Final Product-Completeness Closure

**Date:** 18 September 2026  
**Status:** APPROVED FOR IMPLEMENTATION by the product owner in chat  
**Authority:** The frozen C2 Web Product Architecture, the 258-ID launch capability registry, and the uploaded SREADYA planning specification.

## Problem

The deployed Web/PWA release proved build, deployment, privacy/security and selected end-to-end flows, but the release gate was too coarse for user-facing product completeness. Family-level implementation traces allowed a capability family to be marked implemented when a normal user could not discover or complete every promised interaction. Several workspace routes remained shells; `More` linked directly to Settings instead of being a feature hub; account/sync pages were informational; public feature pages were thin; browser history worked but an installed PWA had no explicit back control.

## Closure law

A launch capability is not Web-complete merely because a domain file or test exists.

For Web/PWA closure every applicable launch ID must have:
1. an explicit user-visible surface or an explicit active-protection/status surface;
2. a real route reachable from normal navigation;
3. truthful platform behavior (full/adapted/N/A);
4. executable evidence for the user journey or protection;
5. no placeholder/shell copy;
6. no interactive-looking element without a task.

## Product surface

### Primary private navigation
- Home
- Today
- Log
- Calendar
- More

`More` is a real feature hub, not a Settings shortcut. It exposes the complete private product map.

### Workspace header
Every private route gets:
- contextual Back action;
- Sreadya brand/home action;
- current section identity;
- direct access to the feature hub.

### Complete feature hub
The private feature hub groups all production areas:
- Cycle & periods
- Predictions
- Reminders
- Symptoms
- Wellness
- Medication
- Reproductive health
- Life stage
- Insights
- Reports
- Assistant
- Partner sharing
- Vault / backup
- Sync
- Devices
- Privacy Center
- Account
- Recovery
- Diagnostics
- Accessibility & settings

### Public Features page
The public Features route becomes a full, searchable catalogue of the launch capability contract. It explains the difference between interactive health features, privacy/security protections, platform-adapted behavior and future/optional items without claiming unavailable native-only behavior.

## Missing-workspace closure

The shell routes `symptoms`, `wellness`, `medication`, and `reproductive-health` become real structured logging workspaces backed by the encrypted local vault. Structured observations support appropriate severity, numeric values/units, flow levels, labels and private notes rather than reducing every record to category + free text.

## Prediction / insight closure

The UI exposes the launch prediction/insight contract already supported by the domain model and adds the missing user presentation required by the C2 contract:
- next period / window / confidence;
- cycle trend and period-duration estimate;
- PMS estimate;
- optional fertile/ovulation estimate with explicit non-contraceptive boundary;
- prediction generation/history information;
- observational insight cards for flow, symptoms, pain, mood and sleep where data exists;
- source/provenance explanation;
- no invented diagnosis.

## Reminder closure

The reminder workspace exposes cycle-relative reminders plus structured personal reminder intents for medication, contraception context, supplements, ovulation tests, pregnancy tests and custom reminders. Browser/PWA delivery remains honest: in-app/browser mechanisms work locally; closed-app Web Push is only represented as available when a reviewed relay is actually configured. Snooze/action behavior is adapted to what the browser can support.

## Identity / sync / recovery closure

The Web UI must not fake a production provider. It exposes actual account, passkey, device, recovery and sync controls only through the reviewed adapters. When no production sync/identity endpoint is configured, the UI clearly identifies account-free mode as fully operational and marks continuity as unavailable rather than presenting informational cards as if they were live controls. The capability catalogue records this as a deployment-dependent adapted state, not a hidden failure.

## Evidence v2

Create an explicit Web surface ledger for every launch ID. Every row maps to:
- route;
- surface type: interaction / status / protection / platform-adapted;
- implementation path;
- executable evidence path;
- concise user-facing description.

The verifier rejects:
- missing launch IDs;
- duplicate IDs;
- placeholder/shell routes;
- routes absent from the feature hub;
- implementation/evidence paths that do not exist;
- launch IDs mapped only to a broad family without a surface classification.

## Release gate

The final branch is eligible for merge/deployment only after:
- all targeted red tests turn green;
- full Web unit/component suite;
- Playwright navigation and product-completeness E2E;
- shared/reference verification;
- release-backlog scan including `web/src`;
- full Sreadya CI;
- Task 25–28 workflows;
- Pages deployment;
- post-deploy live acceptance on the deployed Pages URL.

No completion claim is allowed before the exact merge SHA passes the live deployment gate.
