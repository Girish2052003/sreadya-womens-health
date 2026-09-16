import type { CycleRepository } from '../../domain/cycle/repository';
import type { PeriodEpisode } from '../../domain/cycle/types';

export type PeriodEdit = {
  start: string;
  end?: string | null;
};

export class PeriodActions {
  constructor(
    private readonly repository: CycleRepository,
    private readonly createId: () => string = () => crypto.randomUUID(),
  ) {}

  async startPeriod(start: string): Promise<void> {
    await this.repository.savePeriod({
      id: this.createId(),
      start,
      source: 'app',
    });
  }

  async endPeriod(id: string, end: string): Promise<void> {
    const period = await this.requirePeriod(id);
    await this.repository.savePeriod({ ...period, end });
  }

  async backdatePeriod(id: string, start: string): Promise<void> {
    const period = await this.requirePeriod(id);
    await this.repository.savePeriod({ ...period, start });
  }

  async editPeriod(id: string, edit: PeriodEdit): Promise<void> {
    const period = await this.requirePeriod(id);
    const updated: PeriodEpisode = {
      ...period,
      start: edit.start,
    };

    if (edit.end !== undefined) {
      updated.end = edit.end;
    }

    await this.repository.savePeriod(updated);
  }

  async deletePeriod(id: string): Promise<void> {
    await this.repository.deletePeriod(id);
  }

  private async requirePeriod(id: string): Promise<PeriodEpisode> {
    const period = (await this.repository.listPeriods()).find((candidate) => candidate.id === id);
    if (period === undefined) {
      throw new Error(`Period not found: ${id}`);
    }
    return period;
  }
}
