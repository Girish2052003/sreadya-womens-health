import type { PredictionEvaluation } from '../../domain/prediction/prediction-history';
import type {
  FlowLevel,
  HealthObservation,
  ObservationKind,
  PeriodEpisode,
  RecordSource,
} from '../../domain/cycle/types';

const DAY_MS = 86_400_000;

export const INSIGHT_CAPABILITY_IDS = [
  'INS-001', 'INS-002', 'INS-003', 'INS-004',
  'INS-005', 'INS-006', 'INS-007', 'INS-008',
  'INS-009', 'INS-010', 'INS-011', 'INS-012',
  'INS-013', 'INS-014', 'INS-015', 'INS-016',
] as const;

export type CycleSummary = {
  averageLength: number;
  shortestLength: number;
  longestLength: number;
  standardDeviation: number;
};

export type InsightProvenance = {
  sources: RecordSource[];
  dateRange: { from: string; to: string } | null;
};

export type InsightSnapshot = {
  cycleSummary: CycleSummary | null;
  averagePeriodDurationDays: number | null;
  flowCounts: Partial<Record<FlowLevel, number>>;
  observationCounts: Partial<Record<ObservationKind, number>>;
  observationalMessages: string[];
  predictionEvaluation?: PredictionEvaluation;
  provenance: InsightProvenance;
};

function utcDateMs(value: string): number {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function periodDurationDays(period: PeriodEpisode): number | null {
  if (period.end == null) return null;
  return Math.floor((utcDateMs(period.end) - utcDateMs(period.start)) / DAY_MS) + 1;
}

function summarizeCycleLengths(lengths: number[]): CycleSummary | null {
  if (lengths.length === 0) return null;
  const averageLength = lengths.reduce((sum, value) => sum + value, 0) / lengths.length;
  const variance = lengths.reduce(
    (sum, value) => sum + ((value - averageLength) ** 2),
    0,
  ) / lengths.length;

  return {
    averageLength,
    shortestLength: Math.min(...lengths),
    longestLength: Math.max(...lengths),
    standardDeviation: Math.sqrt(variance),
  };
}

function cycleDaysFor(
  kind: ObservationKind,
  periods: PeriodEpisode[],
  observations: HealthObservation[],
): number[] {
  if (periods.length === 0) return [];
  const result: number[] = [];

  for (const observation of observations.filter((item) => item.kind === kind)) {
    let latest: PeriodEpisode | undefined;
    const observationDay = utcDateMs(observation.occurredAt);
    for (const period of periods) {
      if (utcDateMs(period.start) <= observationDay) latest = period;
    }
    if (!latest) continue;
    const day = Math.floor((observationDay - utcDateMs(latest.start)) / DAY_MS) + 1;
    if (day >= 1 && day <= 90) result.push(day);
  }

  return result;
}

function symptomTimingInsight(symptomLabel: string, cycleDays: number[]): string {
  if (cycleDays.length === 0) {
    return `${symptomLabel} has not been recorded often enough for a timing insight.`;
  }

  const counts = new Map<number, number>();
  for (const day of cycleDays) counts.set(day, (counts.get(day) ?? 0) + 1);
  let topDay = cycleDays[0];
  let topCount = counts.get(topDay) ?? 0;
  for (const [day, count] of counts) {
    if (count > topCount) {
      topDay = day;
      topCount = count;
    }
  }

  return `${symptomLabel} were recorded most often around cycle day ${topDay}. This is an observation, not a medical cause or diagnosis.`;
}

function title(value: string): string {
  return value.length === 0 ? value : `${value[0].toUpperCase()}${value.slice(1)}`;
}

function buildProvenance(
  periods: PeriodEpisode[],
  observations: HealthObservation[],
): InsightProvenance {
  const sources: RecordSource[] = [];
  const rememberSource = (source: RecordSource) => {
    if (!sources.includes(source)) sources.push(source);
  };
  periods.forEach((period) => rememberSource(period.source));
  observations.forEach((observation) => rememberSource(observation.source));

  const timestamps = [
    ...periods.flatMap((period) => period.end == null ? [period.start] : [period.start, period.end]),
    ...observations.map((observation) => observation.occurredAt),
  ];
  if (timestamps.length === 0) return { sources, dateRange: null };
  const ordered = [...timestamps].sort((left, right) => Date.parse(left) - Date.parse(right));
  return {
    sources,
    dateRange: { from: ordered[0], to: ordered[ordered.length - 1] },
  };
}

export function summarizeInsights({
  periods,
  observations,
  predictionEvaluation,
}: {
  periods: PeriodEpisode[];
  observations: HealthObservation[];
  predictionEvaluation?: PredictionEvaluation;
}): InsightSnapshot {
  const ordered = [...periods].sort((left, right) => Date.parse(left.start) - Date.parse(right.start));
  const cycleLengths: number[] = [];
  for (let index = 1; index < ordered.length; index += 1) {
    const days = Math.floor((utcDateMs(ordered[index].start) - utcDateMs(ordered[index - 1].start)) / DAY_MS);
    if (days >= 15 && days <= 90) cycleLengths.push(days);
  }

  const completedDurations = ordered
    .map(periodDurationDays)
    .filter((value): value is number => value !== null && value > 0);
  const averagePeriodDurationDays = completedDurations.length === 0
    ? null
    : completedDurations.reduce((sum, value) => sum + value, 0) / completedDurations.length;

  const flowCounts: Partial<Record<FlowLevel, number>> = {};
  const observationCounts: Partial<Record<ObservationKind, number>> = {};
  for (const observation of observations) {
    observationCounts[observation.kind] = (observationCounts[observation.kind] ?? 0) + 1;
    if (observation.flowLevel) {
      flowCounts[observation.flowLevel] = (flowCounts[observation.flowLevel] ?? 0) + 1;
    }
  }

  const observationalMessages: string[] = [];
  const timingKinds: Array<[ObservationKind, string]> = [
    ['cramps', 'Cramps'],
    ['headache', 'Headaches'],
    ['migraine', 'Migraines'],
    ['mood', 'Mood observations'],
    ['sleep', 'Sleep observations'],
    ['energy', 'Energy observations'],
    ['stress', 'Stress observations'],
  ];
  for (const [kind, label] of timingKinds) {
    const days = cycleDaysFor(kind, ordered, observations);
    if (days.length >= 2) observationalMessages.push(symptomTimingInsight(label, days));
  }

  const flowEntries = Object.entries(flowCounts) as Array<[FlowLevel, number]>;
  if (flowEntries.length > 0) {
    let top = flowEntries[0];
    for (const entry of flowEntries.slice(1)) {
      if (entry[1] > top[1]) top = entry;
    }
    observationalMessages.push(
      `${title(top[0])} flow was your most frequently recorded flow level (${top[1]} logs). This is a summary of your entries, not a medical interpretation.`,
    );
  }

  return {
    cycleSummary: summarizeCycleLengths(cycleLengths),
    averagePeriodDurationDays,
    flowCounts,
    observationCounts,
    observationalMessages,
    ...(predictionEvaluation ? { predictionEvaluation } : {}),
    provenance: buildProvenance(ordered, observations),
  };
}
