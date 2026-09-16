import type { CycleRepository } from '../../domain/cycle/repository';
import type { HealthObservation } from '../../domain/cycle/types';

export type ObservationDraft = Omit<HealthObservation, 'id' | 'source'>;
export type ObservationEdit = Partial<Omit<HealthObservation, 'id' | 'source'>>;

export class ObservationActions {
  constructor(
    private readonly repository: CycleRepository,
    private readonly createId: () => string = () => crypto.randomUUID(),
  ) {}

  async logObservation(draft: ObservationDraft): Promise<string> {
    const id = this.createId();
    await this.repository.saveObservation({
      id,
      ...draft,
      source: 'app',
    });
    return id;
  }

  async editObservation(id: string, edit: ObservationEdit): Promise<void> {
    const observation = await this.requireObservation(id);
    await this.repository.saveObservation({
      ...observation,
      ...edit,
      id,
      source: observation.source,
    });
  }

  async deleteObservation(id: string): Promise<void> {
    await this.repository.deleteObservation(id);
  }

  private async requireObservation(id: string): Promise<HealthObservation> {
    const observation = (await this.repository.listObservations()).find((candidate) => candidate.id === id);
    if (observation === undefined) {
      throw new Error(`Observation not found: ${id}`);
    }
    return observation;
  }
}
