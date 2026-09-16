import type { CycleRepository } from '../../domain/cycle/repository';
import type { PeriodEpisode } from '../../domain/cycle/types';

export type YearHistoryGroup = {
  year: number;
  periods: PeriodEpisode[];
};

export class CalendarHistory {
  constructor(private readonly repository: CycleRepository) {}

  async month(year: number, month: number): Promise<PeriodEpisode[]> {
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error(`Invalid calendar month: ${month}`);
    }

    const periods = await this.repository.listPeriods();
    return periods
      .filter((period) => {
        const start = new Date(period.start);
        return start.getUTCFullYear() === year && start.getUTCMonth() + 1 === month;
      })
      .reverse();
  }

  async timeline(): Promise<PeriodEpisode[]> {
    return (await this.repository.listPeriods()).reverse();
  }

  async year(): Promise<YearHistoryGroup[]> {
    const groups = new Map<number, PeriodEpisode[]>();

    for (const period of await this.repository.listPeriods()) {
      const year = new Date(period.start).getUTCFullYear();
      const periods = groups.get(year) ?? [];
      periods.push(period);
      groups.set(year, periods);
    }

    return [...groups.entries()]
      .sort(([left], [right]) => right - left)
      .map(([year, periods]) => ({ year, periods }));
  }
}
