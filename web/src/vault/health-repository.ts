import {
  assertPeriodDoesNotOverlap,
  assertValidHealthObservation,
  assertValidPeriodEpisode,
} from '../domain/cycle/invariants';
import type { CycleRepository, ObservationRange } from '../domain/cycle/repository';
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

function failReplacementValidation(): never {
  throw new Error('Health dataset failed domain validation.');
}

function validateReplacementDataset(
  periods: readonly PeriodEpisode[],
  observations: readonly HealthObservation[],
) {
  try {
    for (const period of periods) assertValidPeriodEpisode(period);
    for (const observation of observations) assertValidHealthObservation(observation);
  } catch {
    failReplacementValidation();
  }

  const periodIds = new Set<string>();
  const orderedPeriods = [...periods].sort((left, right) => Date.parse(left.start) - Date.parse(right.start));
  for (let index = 0; index < orderedPeriods.length; index += 1) {
    const current = orderedPeriods[index];
    if (!periodIds.add(current.id)) failReplacementValidation();
    if (index === 0) continue;

    const previous = orderedPeriods[index - 1];
    const previousEnd = previous.end ?? previous.start;
    if (Date.parse(previousEnd) >= Date.parse(current.start)) failReplacementValidation();
  }

  const observationIds = new Set<string>();
  for (const observation of observations) {
    if (!observationIds.add(observation.id)) failReplacementValidation();
  }
}

export class HealthVaultRepository implements CycleRepository {
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

  async replaceAll(input: { periods: PeriodEpisode[]; observations: HealthObservation[] }): Promise<void> {
    validateReplacementDataset(input.periods, input.observations);

    const currentIds = await this.vault.listRecordIds();
    const healthIds = currentIds.filter(
      (id) => id.startsWith(PERIOD_PREFIX) || id.startsWith(OBSERVATION_PREFIX),
    );
    const replacements = [
      ...input.periods.map((period) => ({ id: periodRecordId(period.id), value: period })),
      ...input.observations.map((observation) => ({ id: observationRecordId(observation.id), value: observation })),
    ];

    await this.vault.replaceRecordsAtomically(healthIds, replacements);
  }
}
