import {
  openCycleVaultV1,
  sealCycleVaultV1,
  type CycleVaultManifestV1,
  type CycleVaultObservationV1,
  type CycleVaultPayloadV1,
  type CycleVaultPeriodV1,
} from './cyclevault';
import {
  assertValidHealthObservation,
  assertValidPeriodEpisode,
} from '../domain/cycle/invariants';
import {
  OBSERVATION_KINDS,
  type FlowLevel,
  type HealthObservation,
  type ObservationKind,
  type PeriodEpisode,
  type Severity,
} from '../domain/cycle/types';
import type { HealthVaultRepository } from '../vault/health-repository';

const APP_VERSION = '1.0.0';
const DATABASE_SCHEMA = 1;
const PREDICTION_ENGINE = 'prediction-v1';
const SEVERITIES = ['mild', 'moderate', 'severe'] as const;
const FLOW_LEVELS = ['spotting', 'light', 'medium', 'heavy'] as const;

type CycleVaultWebServiceDependencies = {
  now?: () => Date;
  randomBytes?: (count: number) => Uint8Array;
};

export type CycleVaultRestoreResult = {
  periods: number;
  observations: number;
};

function defaultRandomBytes(count: number) {
  const output = new Uint8Array(count);
  crypto.getRandomValues(output);
  return output;
}

function failDomainValidation(): never {
  throw new Error('CycleVault restore failed domain validation.');
}

function isOneOf<T extends string>(value: string, values: readonly T[]): value is T {
  return (values as readonly string[]).includes(value);
}

function manifestFor(createdAtUtc: string): CycleVaultManifestV1 {
  return {
    format: 'SREVA-CYCLEVAULT',
    formatVersion: 1,
    createdAtUtc,
    appVersion: APP_VERSION,
    databaseSchema: DATABASE_SCHEMA,
    predictionEngine: PREDICTION_ENGINE,
    kdf: 'argon2id-m19MiB-t2-p1',
    cipher: 'aes-256-gcm',
  };
}

function periodToPayload(value: PeriodEpisode): CycleVaultPeriodV1 {
  return {
    id: value.id,
    start: value.start,
    end: value.end ?? null,
    source: value.source,
    externalId: value.externalId ?? null,
  };
}

function observationToPayload(value: HealthObservation): CycleVaultObservationV1 {
  return {
    id: value.id,
    kind: value.kind,
    occurredAt: value.occurredAt,
    severity: value.severity ?? null,
    numericValue: value.numericValue ?? null,
    unit: value.unit ?? null,
    label: value.label ?? null,
    note: value.note ?? null,
    flowLevel: value.flowLevel ?? null,
    source: value.source,
    externalId: value.externalId ?? null,
  };
}

function restoredPeriod(value: CycleVaultPeriodV1): PeriodEpisode {
  const period: PeriodEpisode = {
    id: value.id,
    start: value.start,
    end: value.end,
    source: 'cycleVault',
    ...(value.externalId === null ? {} : { externalId: value.externalId }),
  };
  try {
    assertValidPeriodEpisode(period);
  } catch {
    failDomainValidation();
  }
  return period;
}

function restoredObservation(value: CycleVaultObservationV1): HealthObservation {
  if (!isOneOf(value.kind, OBSERVATION_KINDS)) failDomainValidation();
  if (value.severity !== null && !isOneOf(value.severity, SEVERITIES)) failDomainValidation();
  if (value.flowLevel !== null && !isOneOf(value.flowLevel, FLOW_LEVELS)) failDomainValidation();

  const observation: HealthObservation = {
    id: value.id,
    kind: value.kind as ObservationKind,
    occurredAt: value.occurredAt,
    source: 'cycleVault',
    ...(value.severity === null ? {} : { severity: value.severity as Severity }),
    ...(value.numericValue === null ? {} : { numericValue: value.numericValue }),
    ...(value.unit === null ? {} : { unit: value.unit }),
    ...(value.label === null ? {} : { label: value.label }),
    ...(value.note === null ? {} : { note: value.note }),
    ...(value.flowLevel === null ? {} : { flowLevel: value.flowLevel as FlowLevel }),
    ...(value.externalId === null ? {} : { externalId: value.externalId }),
  };
  try {
    assertValidHealthObservation(observation);
  } catch {
    failDomainValidation();
  }
  return observation;
}

export class CycleVaultWebService {
  private readonly now: () => Date;
  private readonly randomBytes: (count: number) => Uint8Array;

  constructor(
    private readonly repository: HealthVaultRepository,
    dependencies: CycleVaultWebServiceDependencies = {},
  ) {
    this.now = dependencies.now ?? (() => new Date());
    this.randomBytes = dependencies.randomBytes ?? defaultRandomBytes;
  }

  async exportContainer(passphrase: string): Promise<string> {
    const periods = await this.repository.listPeriods();
    const observations = await this.repository.listObservations();
    const payload: CycleVaultPayloadV1 = {
      periods: periods.map(periodToPayload),
      observations: observations.map(observationToPayload),
    };

    return sealCycleVaultV1({
      manifest: manifestFor(this.now().toISOString()),
      payload,
      passphrase,
      salt: this.randomBytes(16),
      nonce: this.randomBytes(12),
    });
  }

  async restoreContainer(containerJson: string, passphrase: string): Promise<CycleVaultRestoreResult> {
    const payload = await openCycleVaultV1(containerJson, passphrase);
    const periods = payload.periods.map(restoredPeriod);
    const observations = payload.observations.map(restoredObservation);

    await this.repository.replaceAll({ periods, observations });
    return { periods: periods.length, observations: observations.length };
  }
}
