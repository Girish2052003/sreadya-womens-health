import { expect, test } from 'vitest';

import { assertValidPeriodEpisode } from './invariants';

test('rejects a period whose end is before its start', () => {
  expect(() =>
    assertValidPeriodEpisode({
      id: 'period-1',
      start: '2026-09-16T00:00:00.000Z',
      end: '2026-09-15T23:59:59.000Z',
      source: 'app',
    }),
  ).toThrowError('Period end cannot be before start.');
});
