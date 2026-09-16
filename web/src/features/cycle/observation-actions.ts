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

  async logObservation(draft: ObservationDraft): Promise<string> {
    void draft;
    throw new Error('Task 10 observation actions not implemented.');
  }

  async editObservation(id: string, edit: ObservationEdit): Promise<void> {
    void id;
    void edit;
    throw new Error('Task 10 observation actions not implemented.');
  }

  async deleteObservation(id: string): Promise<void> {
    void id;
    throw new Error('Task 10 observation actions not implemented.');
  }
}
