import type { PeriodEpisode } from '../domain/cycle/types';
import type { VaultService } from './vault-service';

export class HealthVaultRepository {
  constructor(private readonly vault: VaultService) {
    void this.vault;
  }

  async listPeriods(): Promise<PeriodEpisode[]> {
    throw new Error('Task 9 period repository not implemented.');
  }

  async savePeriod(_episode: PeriodEpisode): Promise<void> {
    throw new Error('Task 9 period repository not implemented.');
  }

  async deletePeriod(_id: string): Promise<void> {
    throw new Error('Task 9 period repository not implemented.');
  }
}
