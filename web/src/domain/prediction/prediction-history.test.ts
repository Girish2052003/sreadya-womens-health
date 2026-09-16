import { describe, expect, it } from 'vitest';

import type { PredictionResult } from '../../features/predictions/prediction-engine';
import { evaluatePredictionHistory } from './prediction-history';

function prediction(
  confidence: PredictionResult['confidence'],
  mostLikelyDate: string,
  windowStart: string,
  windowEnd: string,
): PredictionResult {
  return {
    algorithmVersion: 'prediction-v1',
    estimatedCycleLengthDays: 28,
    estimatedPeriodDurationDays: 5,
    mostLikelyDate,
    windowStart,
    windowEnd,
    confidence,
    validIntervals: [28, 28, 28],
    excludedIntervals: [],
    medianAbsoluteDeviation: 0,
  };
}

describe('prediction-v1 history evaluation', () => {
  it('matches the established mobile accuracy semantics', () => {
    const evaluation = evaluatePredictionHistory([
      {
        prediction: prediction('high', '2026-04-23', '2026-04-21', '2026-04-25'),
        actualStart: '2026-04-24',
      },
      {
        prediction: prediction('low', '2026-05-20', '2026-05-18', '2026-05-22'),
        actualStart: '2026-05-20',
      },
    ]);

    expect(evaluation).toEqual({
      sampleCount: 2,
      meanAbsoluteErrorDays: 0.5,
      medianAbsoluteErrorDays: 0.5,
      windowCoverage: 1,
      earlyBiasDays: 0,
      lateBiasDays: 1,
      overConfidenceRate: 0,
      underConfidenceRate: 1,
    });
  });
});
