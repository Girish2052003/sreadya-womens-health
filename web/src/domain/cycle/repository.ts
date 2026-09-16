import type { HealthObservation, PeriodEpisode } from './types';

export type ObservationRange = {
  from?: string;
  to?: string;
};

export interface CycleRepository {
  listPeriods(): Promise<PeriodEpisode[]>;
  savePeriod(episode: PeriodEpisode): Promise<void>;
  deletePeriod(id: string): Promise<void>;

  listObservations(range?: ObservationRange): Promise<HealthObservation[]>;
  saveObservation(observation: HealthObservation): Promise<void>;
  deleteObservation(id: string): Promise<void>;
}
