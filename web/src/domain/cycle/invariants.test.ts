import { expect, test } from 'vitest';

import {
  assertPeriodDoesNotOverlap,
  assertValidPeriodEpisode,
} from './invariants';

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

test('rejects inclusive overlap with another period episode', () => {
  expect(() =>
    assertPeriodDoesNotOverlap(
      {
        id: 'period-new',
        start: '2026-09-16T00:00:00.000Z',
        end: '2026-09-18T00:00:00.000Z',
        source: 'app',
      },
      [
        {
          id: 'period-existing',
          start: '2026-09-18T00:00:00.000Z',
          end: '2026-09-20T00:00:00.000Z',
          source: 'app',
        },
      ],
    ),
  ).toThrowError('Period episodes cannot overlap without an explicit merge.');
});
