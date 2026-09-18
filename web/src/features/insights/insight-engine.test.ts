import { describe, expect, it } from 'vitest';

import type { HealthObservation, PeriodEpisode } from '../../domain/cycle/types';
import { INSIGHT_CAPABILITY_IDS, summarizeInsights } from './insight-engine';

const periods: PeriodEpisode[] = [
  { id: 'p1', start: '2026-06-01T00:00:00.000Z', end: '2026-06-05T00:00:00.000Z', source: 'app' },
  { id: 'p2', start: '2026-06-29T00:00:00.000Z', end: '2026-07-03T00:00:00.000Z', source: 'cycleVault' },
  { id: 'p3', start: '2026-07-27T00:00:00.000Z', end: '2026-07-31T00:00:00.000Z', source: 'app' },
];

const observations: HealthObservation[] = [
  { id: 'o1', kind: 'cramps', occurredAt: '2026-06-02T09:00:00.000Z', severity: 'mild', source: 'app' },
  { id: 'o2', kind: 'cramps', occurredAt: '2026-06-30T09:00:00.000Z', severity: 'moderate', source: 'healthConnect' },
  { id: 'o3', kind: 'menstrualFlow', occurredAt: '2026-06-02T10:00:00.000Z', flowLevel: 'heavy', source: 'app' },
  { id: 'o4', kind: 'menstrualFlow', occurredAt: '2026-06-30T10:00:00.000Z', flowLevel: 'heavy', source: 'app' },
];

describe('Task 13 local insight parity', () => {
  it('implements INS-001 through INS-016 with mobile-equivalent cycle statistics', () => {
    expect(INSIGHT_CAPABILITY_IDS).toHaveLength(16);
    expect(INSIGHT_CAPABILITY_IDS[0]).toBe('INS-001');
    expect(INSIGHT_CAPABILITY_IDS.at(-1)).toBe('INS-016');

    const insight = summarizeInsights({ periods, observations });
    expect(insight.cycleSummary).toEqual({
      averageLength: 28,
      shortestLength: 28,
      longestLength: 28,
      standardDeviation: 0,
    });
    expect(insight.averagePeriodDurationDays).toBe(5);
    expect(insight.flowCounts.heavy).toBe(2);
    expect(insight.observationCounts.cramps).toBe(2);
  });

  it('returns language-neutral pattern facts with provenance behind the result', () => {
    const insight = summarizeInsights({ periods, observations });

    expect(insight.timingInsights).toContainEqual({
      kind: 'cramps',
      cycleDay: 2,
    });
    expect(insight.topFlowPattern).toEqual({
      flow: 'heavy',
      count: 2,
    });
    expect(insight.provenance.sources).toEqual(['app', 'cycleVault', 'healthConnect']);
    expect(insight.provenance.dateRange).toEqual({
      from: '2026-06-01T00:00:00.000Z',
      to: '2026-07-31T00:00:00.000Z',
    });
  });
});
