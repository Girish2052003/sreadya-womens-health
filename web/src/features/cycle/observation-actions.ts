import type { CycleRepository } from '../../domain/cycle/repository';
import type { HealthObservation } from '../../domain/cycle/types';

export type ObservationDraft = Omit<HealthObservation, 'id' | 'source'>;
export type ObservationEdit = Partial<Omit<HealthObservation, 'id' | 'source'>>;

export class ObservationActions {
  constructor(
    private readonly repository: CycleRepository,
    private readonly createId: () => string = () => crypto.randomUUID(),
  ) {
    void this.repository;
    void this.createId;
  }

  async logObservation(_draft: ObservationDraft): Promise<string> {
    throw new Error('Task 10 observation actions not implemented.');
  }

  async editObservation(_id: string, _edit: ObservationEdit): Promise<void> {
    throw new Error('Task 10 observation actions not implemented.');
  }

  async deleteObservation(_id: string): Promise<void> {
    throw new Error('Task 10 observation actions not implemented.');
  }
}
