import type { PredictionResult } from '../../features/predictions/prediction-engine';

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

export function evaluatePredictionHistory(
  _outcomes: PredictionOutcome[],
): PredictionEvaluation {
  void _outcomes;
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
