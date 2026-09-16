import {
  assertPeriodDoesNotOverlap,
  assertValidHealthObservation,
  assertValidPeriodEpisode,
} from '../domain/cycle/invariants';
import type { HealthObservation, PeriodEpisode } from '../domain/cycle/types';
import type { VaultService } from './vault-service';

const PERIOD_PREFIX = 'health:period:';
const OBSERVATION_PREFIX = 'health:observation:';

function periodRecordId(id: string) {
  return `${PERIOD_PREFIX}${id}`;
}

function observationRecordId(id: string) {
  return `${OBSERVATION_PREFIX}${id}`;
}

export type ObservationRange = {
  from?: string;
  to?: string;
};

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

  async listObservations(range: ObservationRange = {}): Promise<HealthObservation[]> {
    const ids = (await this.vault.listRecordIds()).filter((id) => id.startsWith(OBSERVATION_PREFIX));
    const observations = await Promise.all(ids.map((id) => this.vault.read<HealthObservation>(id)));
    const from = range.from === undefined ? null : Date.parse(range.from);
    const to = range.to === undefined ? null : Date.parse(range.to);

    return observations
      .filter((observation) => {
        const occurredAt = Date.parse(observation.occurredAt);
        return (from === null || occurredAt >= from) && (to === null || occurredAt <= to);
      })
      .sort((left, right) => Date.parse(left.occurredAt) - Date.parse(right.occurredAt));
  }

  async saveObservation(observation: HealthObservation): Promise<void> {
    assertValidHealthObservation(observation);
    await this.vault.write(observationRecordId(observation.id), observation);
  }

  async deleteObservation(id: string): Promise<void> {
    await this.vault.delete(observationRecordId(id));
  }
}
