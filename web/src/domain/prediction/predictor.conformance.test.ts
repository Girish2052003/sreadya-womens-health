import vectors from '../../../../shared/prediction/test-vectors/prediction-v1.json';
import { describe, expect, it } from 'vitest';

import { predictCycle } from './predictor';

describe('canonical prediction-v1 domain conformance', () => {
  it('matches every shared golden vector exactly', () => {
    for (const testCase of vectors.cases) {
      expect(predictCycle(testCase.input), testCase.id).toEqual(testCase.expected);
    }
  });
});
