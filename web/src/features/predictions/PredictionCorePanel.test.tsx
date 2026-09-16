import { render, screen } from '@testing-library/react';
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
    render(<PredictionCorePanel prediction={prediction} />);

    expect(screen.getByRole('heading', { name: 'Prediction' })).toBeTruthy();
    expect(screen.getByText('Most likely date')).toBeTruthy();
    expect(screen.getByText('Expected range')).toBeTruthy();
    expect(screen.getByText('Confidence')).toBeTruthy();
    expect(screen.getByText('High')).toBeTruthy();
    expect(screen.getByText(/based on 6 recent valid cycle intervals/i)).toBeTruthy();
    expect(screen.getByText(/estimate, not a guarantee/i)).toBeTruthy();
  });

  it('does not fabricate a prediction with insufficient history', () => {
    render(<PredictionCorePanel prediction={null} />);

    expect(screen.getByText(/more cycle history is needed/i)).toBeTruthy();
    expect(screen.queryByText('High')).toBeNull();
  });
});
