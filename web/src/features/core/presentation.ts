import type { ObservationKind, PeriodEpisode } from '../../domain/cycle/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

const OBSERVATION_LABEL_OVERRIDES: Partial<Record<ObservationKind, string>> = {
  menstrualFlow: 'Menstrual flow',
  backPain: 'Back pain',
  breastTenderness: 'Breast tenderness',
  vaginalDischarge: 'Vaginal discharge',
  cervicalMucus: 'Cervical mucus',
  basalBodyTemperature: 'Basal body temperature',
  ovulationTest: 'Ovulation test',
  pregnancyTest: 'Pregnancy test',
  sexualActivity: 'Sexual activity',
  dailyNote: 'Private daily note',
  custom: 'Custom observation',
};

export function observationLabel(kind: ObservationKind): string {
  const overridden = OBSERVATION_LABEL_OVERRIDES[kind];
  if (overridden) return overridden;
  const spaced = kind.replace(/([a-z])([A-Z])/g, '$1 $2');
  return `${spaced.charAt(0).toUpperCase()}${spaced.slice(1)}`;
}

export function titleCase(value: string): string {
  return value.length === 0 ? value : `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

export function formatUtcDate(value: string): string {
  const date = new Date(value);
  const month = MONTHS[date.getUTCMonth()];
  return `${date.getUTCDate()} ${month} ${date.getUTCFullYear()}`;
}

export function formatDateInput(value: string): string {
  const date = new Date(value);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

export function periodDurationDays(period: PeriodEpisode): number | null {
  if (period.end == null) return null;
  const start = new Date(period.start).getTime();
  const end = new Date(period.end).getTime();
  return Math.floor((end - start) / 86_400_000) + 1;
}
