# Sreadya prediction-v1 contract

`prediction-v1` freezes the already-tested Flutter cycle-prediction semantics so every Sreadya client can be checked against the **same golden vectors**. This document does not introduce a Web-specific predictor and does not make a medical, fertility, or contraceptive-effectiveness claim.

## Inputs and calendar semantics

The engine consumes the final repository view of period-start calendar dates plus optional completed period durations. Correction and deletion are repository operations; the predictor receives only the resulting history. Prediction dates are calendar dates, not timezone-shiftable instants. Transport layers may use UTC RFC3339 timestamps where the shared schemas require them, but adapters must preserve the user's intended calendar date before calling this algorithm.

Fewer than two period starts returns no prediction. Starts are reduced to year/month/day and sorted. Consecutive cycle intervals shorter than **15** days or longer than **90** days are excluded from the estimator. Both 15 and 90 are inclusive valid boundaries. If no valid interval remains, the result is absent. At most the latest 12 valid intervals are used.

## Estimate

Let `valid` be the retained interval sequence. Compute its median and a recency-weighted mean using integer weights 1, 2, ..., n in chronological interval order. The estimated cycle length is the nearest integer to the average of the median and weighted mean, using the runtime's ordinary positive-number round-to-nearest behaviour.

The median absolute deviation (MAD) is the median of `abs(interval - median)`. The uncertainty half-width begins as `max(2, 1.5 * MAD + dataPenalty)`, rounded to the nearest integer and clamped to 2 through 10 days. `dataPenalty` is 2 with fewer than four valid intervals, 1 with four or five, and 0 otherwise. The likely date is the latest period start plus the estimated cycle length; the expected window is the likely date plus/minus the half-width.

Confidence is `high` when there are at least six valid intervals and MAD <= 2; otherwise `medium` when there are at least three valid intervals and MAD <= 5; otherwise `low`.

Completed period durations outside 1 through 14 days are ignored. If any valid durations remain, the estimated duration is their median rounded to the nearest integer; otherwise it is absent.

## Cross-platform conformance

Flutter, Web/PWA, and future compatible clients must pass `shared/prediction/test-vectors/prediction-v1.json` without independently tuning constants or confidence rules. The vectors include regular and irregular history, insufficient history, the 15/90-day boundaries, outlier exclusion, post-correction/deletion repository states, leap-year arithmetic, calendar-date/timezone safety, and low/medium/high confidence boundaries.

Prediction output is an estimate with uncertainty, not a diagnosis or guarantee. UI must preserve that boundary and must not imply contraceptive effectiveness.
