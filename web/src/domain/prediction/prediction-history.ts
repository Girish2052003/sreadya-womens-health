import type { PredictionResult } from '../../features/predictions/prediction-engine';

const DAY_MS = 86_400_000;

export type PredictionOutcome = {
  prediction: PredictionResult;
  actualStart: string;
};

export type PredictionEvaluation = {
  sampleCount: number;
  meanAbsoluteErrorDays: number;
  medianAbsoluteErrorDays: number;
  windowCoverage: number;
  earlyBiasDays: number;
  lateBiasDays: number;
  overConfidenceRate: number;
  underConfidenceRate: number;
};

function dateOnlyMs(value: string): number {
  const date = value.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error(`prediction history requires a calendar date: ${value}`);
  const result = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (new Date(result).toISOString().slice(0, 10) !== date) {
    throw new Error(`prediction history received an invalid calendar date: ${value}`);
  }
  return result;
}

function signedErrorDays(outcome: PredictionOutcome): number {
  return Math.round(
    (dateOnlyMs(outcome.actualStart) - dateOnlyMs(outcome.prediction.mostLikelyDate)) / DAY_MS,
  );
}

function withinWindow(outcome: PredictionOutcome): boolean {
  const actual = dateOnlyMs(outcome.actualStart);
  return actual >= dateOnlyMs(outcome.prediction.windowStart)
    && actual <= dateOnlyMs(outcome.prediction.windowEnd);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 1
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
}

export function evaluatePredictionHistory(
  outcomes: PredictionOutcome[],
): PredictionEvaluation {
  if (outcomes.length === 0) {
    return {
      sampleCount: 0,
      meanAbsoluteErrorDays: 0,
      medianAbsoluteErrorDays: 0,
      windowCoverage: 0,
      earlyBiasDays: 0,
      lateBiasDays: 0,
      overConfidenceRate: 0,
      underConfidenceRate: 0,
    };
  }

  const signed = outcomes.map(signedErrorDays);
  const absolute = signed.map((value) => Math.abs(value));
  const early = signed.filter((value) => value < 0).map((value) => Math.abs(value));
  const late = signed.filter((value) => value > 0);
  const highConfidence = outcomes.filter((outcome) => outcome.prediction.confidence === 'high');
  const lowConfidence = outcomes.filter((outcome) => outcome.prediction.confidence === 'low');

  return {
    sampleCount: outcomes.length,
    meanAbsoluteErrorDays: mean(absolute),
    medianAbsoluteErrorDays: median(absolute),
    windowCoverage: outcomes.filter(withinWindow).length / outcomes.length,
    earlyBiasDays: mean(early),
    lateBiasDays: mean(late),
    overConfidenceRate: highConfidence.length === 0
      ? 0
      : highConfidence.filter((outcome) => !withinWindow(outcome)).length / highConfidence.length,
    underConfidenceRate: lowConfidence.length === 0
      ? 0
      : lowConfidence.filter(withinWindow).length / lowConfidence.length,
  };
}
