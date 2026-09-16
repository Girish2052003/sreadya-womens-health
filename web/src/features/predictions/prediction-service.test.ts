import { describe, expect, it } from 'vitest';

import type { CycleRepository, ObservationRange } from '../../domain/cycle/repository';
import type { HealthObservation, PeriodEpisode } from '../../domain/cycle/types';
import { predictFromRepository } from './prediction-service';

class MutableCycleRepository implements CycleRepository {
  periods: PeriodEpisode[] = [];

  async listPeriods(): Promise<PeriodEpisode[]> {
    return [...this.periods];
  }

  async savePeriod(episode: PeriodEpisode): Promise<void> {
    this.periods = [...this.periods.filter((candidate) => candidate.id !== episode.id), episode];
  }

  async deletePeriod(id: string): Promise<void> {
    this.periods = this.periods.filter((candidate) => candidate.id !== id);
  }

  async listObservations(_range?: ObservationRange): Promise<HealthObservation[]> {
    void _range;
    return [];
  }

  async saveObservation(_observation: HealthObservation): Promise<void> {
    void _observation;
  }

  async deleteObservation(_id: string): Promise<void> {
    void _id;
  }
}

function completedPeriod(id: string, start: string, end: string): PeriodEpisode {
  return { id, start: `${start}T00:00:00Z`, end: `${end}T00:00:00Z`, source: 'app' };
}

describe('repository-backed prediction-v1', () => {
  it('uses the current final period history and recalculates after deletion', async () => {
    const repository = new MutableCycleRepository();
    repository.periods = [
      completedPeriod('p1', '2026-01-01', '2026-01-05'),
      completedPeriod('p2', '2026-01-29', '2026-02-02'),
      completedPeriod('p3', '2026-02-26', '2026-03-02'),
      completedPeriod('p4', '2026-03-26', '2026-03-30'),
    ];

    const prediction = await predictFromRepository(repository, '2026-04-01T00:00:00Z');
    expect(prediction).toMatchObject({
      algorithmVersion: 'prediction-v1',
      estimatedCycleLengthDays: 28,
      estimatedPeriodDurationDays: 5,
      mostLikelyDate: '2026-04-23',
      windowStart: '2026-04-21',
      windowEnd: '2026-04-25',
      confidence: 'medium',
    });

    repository.periods = [repository.periods[3]];
    expect(await predictFromRepository(repository, '2026-04-01T00:00:00Z')).toBeNull();
  });
});
