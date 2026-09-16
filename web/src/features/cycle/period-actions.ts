import type { CycleRepository } from '../../domain/cycle/repository';

export type PeriodEdit = {
  start: string;
  end?: string | null;
};

export class PeriodActions {
  constructor(
    private readonly repository: CycleRepository,
    private readonly createId: () => string = () => crypto.randomUUID(),
  ) {
    void this.repository;
    void this.createId;
  }

  async startPeriod(_start: string): Promise<void> {
    throw new Error('Task 10 period actions not implemented.');
  }

  async endPeriod(_id: string, _end: string): Promise<void> {
    throw new Error('Task 10 period actions not implemented.');
  }

  async backdatePeriod(_id: string, _start: string): Promise<void> {
    throw new Error('Task 10 period actions not implemented.');
  }

  async editPeriod(_id: string, _edit: PeriodEdit): Promise<void> {
    throw new Error('Task 10 period actions not implemented.');
  }

  async deletePeriod(_id: string): Promise<void> {
    throw new Error('Task 10 period actions not implemented.');
  }
}
