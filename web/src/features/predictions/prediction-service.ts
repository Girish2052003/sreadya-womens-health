import type { CycleRepository } from '../../domain/cycle/repository';
import type { PeriodEpisode } from '../../domain/cycle/types';
import { predictCycle, type PredictionResult } from './prediction-engine';

const DAY_MS = 86_400_000;

function calendarDate(value: string): string {
  return value.slice(0, 10);
}

function completedDurationDays(period: PeriodEpisode): number | null {
  if (!period.end) return null;
  const start = Date.parse(`${calendarDate(period.start)}T00:00:00Z`);
  const end = Date.parse(`${calendarDate(period.end)}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.round((end - start) / DAY_MS) + 1;
}

export async function predictFromRepository(
  repository: CycleRepository,
  createdAt: string,
): Promise<PredictionResult | null> {
  const periods = await repository.listPeriods();
  const completedPeriodDurations = periods
    .map(completedDurationDays)
    .filter((duration): duration is number => duration !== null);

  return predictCycle({
    periodStarts: periods.map((period) => calendarDate(period.start)),
    completedPeriodDurations,
    createdAt,
  });
}
