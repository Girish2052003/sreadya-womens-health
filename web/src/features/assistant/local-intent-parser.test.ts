import vectors from '../../../../shared/assistant/test-vectors/local-intent-v1.json';
import { describe, expect, it } from 'vitest';

import { ASSISTANT_CAPABILITY_IDS, parseLocalIntent } from './local-intent-parser';

describe('Task 13 local assistant parity', () => {
  it('covers INT-001 through INT-009 without a remote model', () => {
    expect(ASSISTANT_CAPABILITY_IDS).toEqual([
      'INT-001', 'INT-002', 'INT-003', 'INT-004', 'INT-005',
      'INT-006', 'INT-007', 'INT-008', 'INT-009',
    ]);
  });

  it('matches every local-intent-v1 shared vector', () => {
    const now = new Date(vectors.now);
    for (const testCase of vectors.cases) {
      const actual = parseLocalIntent(testCase.input, now);
      expect(actual, testCase.id).toMatchObject(testCase.expected);
    }
  });

  it('supports deterministic local historical search', () => {
    const parsed = parseLocalIntent('Find cramps', new Date(vectors.now));
    expect(parsed).toMatchObject({ intent: 'searchHistory', value: 'cramps', requiresConfirmation: false });
  });

  it('keeps all parsing local and deterministic', () => {
    const now = new Date(vectors.now);
    expect(parseLocalIntent('When is my next period?', now)).toEqual(
      parseLocalIntent('When is my next period?', now),
    );
    expect(parseLocalIntent('It feels different', now)).toMatchObject({
      intent: 'unknown',
      requiresConfirmation: true,
    });
  });
});
