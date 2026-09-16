import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { PredictionResult } from './prediction-engine';
import { PredictionCorePanel } from './PredictionCorePanel';

const prediction: PredictionResult = {
  algorithmVersion: 'prediction-v1',
  estimatedCycleLengthDays: 28,
  estimatedPeriodDurationDays: 5,
  mostLikelyDate: '2026-10-20',
  windowStart: '2026-10-18',
  windowEnd: '2026-10-22',
  confidence: 'high',
  validIntervals: [28, 29, 27, 28, 28, 28],
  excludedIntervals: [],
  medianAbsoluteDeviation: 0,
};

describe('PredictionCorePanel', () => {
  it('shows the frozen prediction contract with honest uncertainty', () => {
    const html = renderToStaticMarkup(<PredictionCorePanel prediction={prediction} />);

    for (const text of [
      'Prediction',
      'Most likely date',
      'Expected range',
      'Confidence',
      'High',
      'based on 6 recent valid cycle intervals',
      'estimate, not a guarantee',
    ]) {
      expect(html.toLowerCase()).toContain(text.toLowerCase());
    }
  });

  it('does not fabricate a prediction with insufficient history', () => {
    const html = renderToStaticMarkup(<PredictionCorePanel prediction={null} />);

    expect(html.toLowerCase()).toContain('more cycle history is needed');
    expect(html).not.toContain('>High<');
  });
});
