import type { PredictionConfidence, PredictionInput, PredictionResult } from './types';

const DAY_MS = 86_400_000;

function median(values: number[]): number {
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  if (ordered.length % 2 === 1) {
    return ordered[middle];
  }
  return (ordered[middle - 1] + ordered[middle]) / 2;
}

function dateOnlyUtcMs(value: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`prediction-v1 requires YYYY-MM-DD calendar dates: ${value}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const result = Date.UTC(year, month - 1, day);
  const canonical = new Date(result).toISOString().slice(0, 10);
  if (canonical !== value) {
    throw new Error(`prediction-v1 received an invalid calendar date: ${value}`);
  }
  return result;
}

function dateOnlyFromUtcMs(value: number): string {
  return new Date(value).toISOString().slice(0, 10);
}

function addCalendarDays(value: string, days: number): string {
  return dateOnlyFromUtcMs(dateOnlyUtcMs(value) + days * DAY_MS);
}

export function predictCycle(input: PredictionInput): PredictionResult | null {
  if (input.periodStarts.length < 2) {
    return null;
  }

  const starts = [...input.periodStarts].sort((left, right) => dateOnlyUtcMs(left) - dateOnlyUtcMs(right));
  const validIntervalsAll: number[] = [];
  const excludedIntervals: number[] = [];

  for (let index = 1; index < starts.length; index += 1) {
    const interval = Math.round((dateOnlyUtcMs(starts[index]) - dateOnlyUtcMs(starts[index - 1])) / DAY_MS);
    if (interval < 15 || interval > 90) {
      excludedIntervals.push(interval);
    } else {
      validIntervalsAll.push(interval);
    }
  }

  if (validIntervalsAll.length === 0) {
    return null;
  }

  const validIntervals = validIntervalsAll.slice(-12);
  const intervalMedian = median(validIntervals);
  const weightTotal = validIntervals.reduce((sum, _interval, index) => sum + index + 1, 0);
  const weightedMean = validIntervals.reduce(
    (sum, interval, index) => sum + interval * (index + 1),
    0,
  ) / weightTotal;
  const estimatedCycleLengthDays = Math.round((intervalMedian + weightedMean) / 2);

  const deviations = validIntervals.map((interval) => Math.abs(interval - intervalMedian));
  const medianAbsoluteDeviation = median(deviations);
  const dataPenalty = validIntervals.length < 4 ? 2 : validIntervals.length <= 5 ? 1 : 0;
  const rawHalfWidth = Math.round(Math.max(2, 1.5 * medianAbsoluteDeviation + dataPenalty));
  const halfWidth = Math.max(2, Math.min(10, rawHalfWidth));

  let confidence: PredictionConfidence = 'low';
  if (validIntervals.length >= 6 && medianAbsoluteDeviation <= 2) {
    confidence = 'high';
  } else if (validIntervals.length >= 3 && medianAbsoluteDeviation <= 5) {
    confidence = 'medium';
  }

  const validDurations = input.completedPeriodDurations.filter((duration) => duration >= 1 && duration <= 14);
  const estimatedPeriodDurationDays = validDurations.length > 0 ? Math.round(median(validDurations)) : null;

  const latestStart = starts[starts.length - 1];
  const mostLikelyDate = addCalendarDays(latestStart, estimatedCycleLengthDays);

  return {
    algorithmVersion: 'prediction-v1',
    estimatedCycleLengthDays,
    estimatedPeriodDurationDays,
    mostLikelyDate,
    windowStart: addCalendarDays(mostLikelyDate, -halfWidth),
    windowEnd: addCalendarDays(mostLikelyDate, halfWidth),
    confidence,
    validIntervals,
    excludedIntervals,
    medianAbsoluteDeviation,
  };
}
