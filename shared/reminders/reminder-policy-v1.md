# Sreadya reminder-policy-v1 contract

This contract freezes the pure reminder-planning semantics already implemented by Flutter. It does not promise that a browser or operating system will deliver a notification while Sreadya is closed. Delivery permissions, background execution, Web Push, OS scheduling, DST resolution, and time-zone conversion belong to platform **adapter** layers.

## Inputs

The policy receives a predicted calendar date, a source prediction ID, current time, enabled cycle offsets, optional late-day offset, selected hour/minute, notification privacy mode, and quiet-hour start/end hours.

Supported cycle offsets are 7, 3, 1, and 0 days, mapping to seven-day, three-day, one-day, and expected-day reminder kinds. Other offsets are ignored. Supported offsets are processed in descending order; a positive `lateDays` adds a late reminder after them.

## Local wall-clock semantics

Reminder plans are expressed in **local wall-clock** calendar values. The pure policy deliberately has no time-zone database. A platform adapter must map those values into the user's selected/current **time zone**, handle DST transitions without silently changing the intended wall-clock time, and report platform limitations honestly.

A candidate inside quiet hours is moved to `quietEndHour:00` on the same intended reminder calendar day. Quiet intervals may wrap midnight. Targets that are not strictly after `now` are suppressed.

When a prediction changes, reminder plans are regenerated against the new predicted date and source prediction ID. Old platform schedules are an adapter lifecycle concern and must be reconciled by the adapter rather than by changing the shared policy.

## Privacy copy

`maximum` emits `You have a reminder.`; `balanced` emits `Your cycle reminder is ready.`. `detailed` emits the existing cycle-relative wording for 7/3/1/expected/late kinds. These strings are frozen by the shared fixtures.

## Cross-platform conformance

Flutter, Web/PWA, and future compatible clients must satisfy `shared/reminders/test-vectors/reminder-v1.json`. The vectors cover 7/3/1/expected/late planning, quiet hours, year and leap-day boundaries, past suppression, DST and time-zone adapter boundaries, and prediction changes. Delivery adapters may differ by platform capability; reminder meaning and privacy policy may not.
