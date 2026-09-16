export const RECORD_SOURCES = ['app', 'healthKit', 'healthConnect', 'cycleVault'] as const;
export type RecordSource = (typeof RECORD_SOURCES)[number];

export const OBSERVATION_KINDS = [
  'menstrualFlow', 'cramps', 'headache', 'migraine', 'backPain',
  'breastTenderness', 'bloating', 'acne', 'nausea', 'digestion',
  'fatigue', 'dizziness', 'appetite', 'cravings', 'sleep', 'energy',
  'stress', 'mood', 'anxiety', 'irritability', 'libido',
  'vaginalDischarge', 'cervicalMucus', 'basalBodyTemperature', 'weight',
  'exercise', 'water', 'custom', 'ovulationTest', 'pregnancyTest',
  'sexualActivity', 'protection', 'contraception', 'medication',
  'supplement', 'dailyNote',
] as const;
export type ObservationKind = (typeof OBSERVATION_KINDS)[number];

export type Severity = 'mild' | 'moderate' | 'severe';
export type FlowLevel = 'spotting' | 'light' | 'medium' | 'heavy';

export type PeriodEpisode = {
  id: string;
  start: string;
  end?: string | null;
  source: RecordSource;
  externalId?: string;
};

export type HealthObservation = {
  id: string;
  kind: ObservationKind;
  occurredAt: string;
  severity?: Severity;
  numericValue?: number;
  unit?: string;
  label?: string;
  note?: string;
  flowLevel?: FlowLevel;
  source: RecordSource;
  externalId?: string;
};
