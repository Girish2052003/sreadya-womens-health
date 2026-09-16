import { describe, expect, it } from 'vitest';

import type { CycleRepository } from '../../domain/cycle/repository';
import type { PeriodEpisode } from '../../domain/cycle/types';
import type { ReminderPolicySettings } from '../../domain/reminders/reminder-policy';
import { prepareReminderSchedule } from './reminder-service';

class FakeRepository implements CycleRepository {
  constructor(private readonly periods: PeriodEpisode[]) {}
  async listPeriods() { return this.periods; }
  async savePeriod() { throw new Error('not used'); }
  async deletePeriod() { throw new Error('not used'); }
  async listObservations() { return []; }
  async saveObservation() { throw new Error('not used'); }
  async deleteObservation() { throw new Error('not used'); }
}

const settings: ReminderPolicySettings = {
  enabledOffsetsDays: [3, 0],
  lateDays: 2,
  hour: 8,
  minute: 0,
  privacy: 'maximum',
  quietStartHour: 22,
  quietEndHour: 7,
};

describe('prepareReminderSchedule', () => {
  it('derives local reminder plans from the same repository-backed Prediction v1 result', async () => {
    const starts = ['2026-07-28', '2026-08-25', '2026-09-22'];
    const repository = new FakeRepository(starts.map((date, index): PeriodEpisode => ({
      id: `p-${index}`,
      start: `${date}T00:00:00.000Z`,
      end: `${date}T23:00:00.000Z`,
      source: 'app',
    })));

    const result = await prepareReminderSchedule(
      repository,
      settings,
      '2026-10-01T00:00:00',
    );

    expect(result.prediction?.mostLikelyDate).toBe('2026-10-20');
    expect(result.plans.map((plan) => plan.targetLocal)).toEqual([
      '2026-10-17T08:00',
      '2026-10-20T08:00',
      '2026-10-22T08:00',
    ]);
  });

  it('returns no reminder plans instead of inventing a date when prediction history is insufficient', async () => {
    const repository = new FakeRepository([{ id: 'p-1', start: '2026-09-22T00:00:00.000Z', source: 'app' }]);

    await expect(prepareReminderSchedule(repository, settings, '2026-10-01T00:00:00')).resolves.toEqual({
      prediction: null,
      plans: [],
    });
  });
});
