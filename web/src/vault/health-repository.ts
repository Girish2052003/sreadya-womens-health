import {
  assertPeriodDoesNotOverlap,
  assertValidPeriodEpisode,
} from '../domain/cycle/invariants';
import type { PeriodEpisode } from '../domain/cycle/types';
import type { VaultService } from './vault-service';

const PERIOD_PREFIX = 'health:period:';

function periodRecordId(id: string) {
  return `${PERIOD_PREFIX}${id}`;
}

export class HealthVaultRepository {
  constructor(private readonly vault: VaultService) {}

  async listPeriods(): Promise<PeriodEpisode[]> {
    const ids = (await this.vault.listRecordIds()).filter((id) => id.startsWith(PERIOD_PREFIX));
    const periods = await Promise.all(ids.map((id) => this.vault.read<PeriodEpisode>(id)));
    return periods.sort((left, right) => Date.parse(left.start) - Date.parse(right.start));
  }

  async savePeriod(episode: PeriodEpisode): Promise<void> {
    assertValidPeriodEpisode(episode);
    const existing = await this.listPeriods();
    assertPeriodDoesNotOverlap(episode, existing);
    await this.vault.write(periodRecordId(episode.id), episode);
  }

  async deletePeriod(id: string): Promise<void> {
    await this.vault.delete(periodRecordId(id));
  }
}
