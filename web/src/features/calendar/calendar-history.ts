import type { CycleRepository } from '../../domain/cycle/repository';
import type { PeriodEpisode } from '../../domain/cycle/types';

export type YearHistoryGroup = {
  year: number;
  periods: PeriodEpisode[];
};

export class CalendarHistory {
  constructor(private readonly repository: CycleRepository) {
    void this.repository;
  }

  async month(year: number, month: number): Promise<PeriodEpisode[]> {
    void year;
    void month;
    throw new Error('Task 10 calendar history not implemented.');
  }

  async timeline(): Promise<PeriodEpisode[]> {
    throw new Error('Task 10 calendar history not implemented.');
  }

  async year(): Promise<YearHistoryGroup[]> {
    throw new Error('Task 10 calendar history not implemented.');
  }
}
