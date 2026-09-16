import { OBSERVATION_KINDS, RECORD_SOURCES } from './types';

export type PeriodEpisodeInvariantInput = {
  id: string;
  start: string;
  end?: string | null;
  source: string;
};

export type HealthObservationInvariantInput = {
  id: string;
  kind: string;
  occurredAt: string;
  source: string;
};

const CANONICAL_UTC_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

function isCanonicalUtcTimestamp(value: string): boolean {
  return CANONICAL_UTC_DATE_TIME.test(value) && Number.isFinite(Date.parse(value));
}

function isRecordSource(value: string): boolean {
  return (RECORD_SOURCES as readonly string[]).includes(value);
}

function isObservationKind(value: string): boolean {
  return (OBSERVATION_KINDS as readonly string[]).includes(value);
}

export function assertValidPeriodEpisode(episode: PeriodEpisodeInvariantInput): void {
  const endIsCanonical = episode.end === undefined || episode.end === null || isCanonicalUtcTimestamp(episode.end);
  if (!isCanonicalUtcTimestamp(episode.start) || !endIsCanonical || !isRecordSource(episode.source)) {
    throw new Error('Period episode does not conform to Sreva PeriodEpisode v1 schema.');
  }

  if (episode.end !== undefined && episode.end !== null) {
    if (Date.parse(episode.end) < Date.parse(episode.start)) {
      throw new Error('Period end cannot be before start.');
    }
  }
}

export function assertValidHealthObservation(observation: HealthObservationInvariantInput): void {
  if (
    !isObservationKind(observation.kind)
    || !isCanonicalUtcTimestamp(observation.occurredAt)
    || !isRecordSource(observation.source)
  ) {
    throw new Error('Health observation does not conform to Sreva HealthObservation v1 schema.');
  }
}

export function assertPeriodDoesNotOverlap(
  candidate: PeriodEpisodeInvariantInput,
  existing: readonly PeriodEpisodeInvariantInput[],
): void {
  const candidateStart = Date.parse(candidate.start);
  const candidateEnd = Date.parse(candidate.end ?? candidate.start);

  for (const period of existing) {
    if (period.id === candidate.id) continue;

    const periodStart = Date.parse(period.start);
    const periodEnd = Date.parse(period.end ?? period.start);
    const overlaps = candidateEnd >= periodStart && periodEnd >= candidateStart;

    if (overlaps) {
      throw new Error('Period episodes cannot overlap without an explicit merge.');
    }
  }
}
