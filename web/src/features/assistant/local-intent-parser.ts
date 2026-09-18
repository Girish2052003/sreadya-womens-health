import type { FlowLevel, ObservationKind, Severity } from '../../domain/cycle/types';

export const ASSISTANT_CAPABILITY_IDS = [
  'INT-001', 'INT-002', 'INT-003', 'INT-004', 'INT-005',
  'INT-006', 'INT-007', 'INT-008', 'INT-009',
] as const;

export type LocalIntent =
  | 'periodStarted'
  | 'periodEnded'
  | 'logFlow'
  | 'logSymptom'
  | 'addReminder'
  | 'nextPeriodQuery'
  | 'historyQuery'
  | 'searchHistory'
  | 'unknown';

export type ReminderKind =
  | 'medication'
  | 'contraception'
  | 'supplement'
  | 'ovulationTest'
  | 'pregnancyTest';

export type ParsedCommand = {
  intent: LocalIntent;
  requiresConfirmation: boolean;
  date?: string;
  value?: string;
  rawText: string;
  reminderHour?: number;
  reminderMinute?: number;
  reminderKind?: ReminderKind;
  observationKind?: ObservationKind;
  flowLevel?: FlowLevel;
  severity?: Severity;
  label?: string;
  note?: string;
};

const SYMPTOMS: Array<[string, ObservationKind]> = [
  ['cramp', 'cramps'],
  ['migraine', 'migraine'],
  ['headache', 'headache'],
  ['back pain', 'backPain'],
  ['breast', 'breastTenderness'],
  ['bloat', 'bloating'],
  ['acne', 'acne'],
  ['nausea', 'nausea'],
  ['digest', 'digestion'],
  ['fatigue', 'fatigue'],
  ['dizz', 'dizziness'],
  ['appetite', 'appetite'],
  ['craving', 'cravings'],
  ['sleep', 'sleep'],
  ['energy', 'energy'],
  ['stress', 'stress'],
  ['mood', 'mood'],
  ['anxiety', 'anxiety'],
  ['irrit', 'irritability'],
  ['libido', 'libido'],
];

function dateKey(date: Date): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function localDateFor(text: string, now: Date): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (text.includes('yesterday')) date.setUTCDate(date.getUTCDate() - 1);
  return dateKey(date);
}

function containsAny(text: string, values: string[]): boolean {
  return values.some((value) => text.includes(value));
}

function parseTime(text: string): [number, number] | null {
  const match = /\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i.exec(text);
  if (!match) return null;
  let hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2] ?? '0', 10);
  if (!Number.isFinite(hour) || hour > 23 || minute > 59) return null;
  const meridiem = match[3]?.toLowerCase();
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (meridiem === 'pm' && hour !== 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
  }
  return [hour, minute];
}

function reminderKind(text: string): ReminderKind {
  if (containsAny(text, ['contraception', 'birth control', 'pill'])) return 'contraception';
  if (text.includes('supplement')) return 'supplement';
  if (text.includes('ovulation')) return 'ovulationTest';
  if (text.includes('pregnancy test')) return 'pregnancyTest';
  return 'medication';
}

function reminderLabel(input: string): string {
  let text = input.trim().replace(/^remind me(?: to| about)?\s*/i, '');
  text = text.replace(/\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*$/i, '');
  return text.trim() || 'Health reminder';
}

function symptomKind(text: string): ObservationKind {
  for (const [needle, kind] of SYMPTOMS) {
    if (text.includes(needle)) return kind;
  }
  return 'custom';
}

function symptomSeverity(text: string): Severity {
  if (containsAny(text, ['severe', 'very bad', 'bad cramps'])) return 'severe';
  if (text.includes('moderate')) return 'moderate';
  return 'mild';
}

export function parseLocalIntent(input: string, now: Date): ParsedCommand {
  const text = input.trim().toLowerCase().replace(/\s+/g, ' ');
  const date = localDateFor(text, now);

  if (text.includes('period') && containsAny(text, ['started', 'start', 'began', 'begin'])) {
    return { intent: 'periodStarted', date, requiresConfirmation: true, rawText: input, note: input };
  }

  if (text.includes('period') && containsAny(text, ['ended', 'end', 'stopped', 'stop'])) {
    return { intent: 'periodEnded', date, requiresConfirmation: true, rawText: input, note: input };
  }

  for (const flow of ['spotting', 'light', 'medium', 'heavy'] as const) {
    if (text.includes(flow) && containsAny(text, ['flow', 'bleeding', 'yesterday', 'today'])) {
      return {
        intent: 'logFlow',
        date,
        value: flow,
        flowLevel: flow,
        observationKind: 'menstrualFlow',
        label: `${flow} flow`,
        requiresConfirmation: true,
        rawText: input,
        note: input,
      };
    }
  }

  const searchMatch = /^(?:search|find|show)\s+(?:my\s+)?(?:history\s+for\s+)?(.+)$/.exec(text);
  if (searchMatch && searchMatch[1]) {
    return { intent: 'searchHistory', value: searchMatch[1].trim(), requiresConfirmation: false, rawText: input };
  }

  if (SYMPTOMS.some(([needle]) => text.includes(needle))) {
    const observationKind = symptomKind(text);
    return {
      intent: 'logSymptom',
      date,
      value: text,
      observationKind,
      severity: symptomSeverity(text),
      label: observationKind,
      requiresConfirmation: true,
      rawText: input,
      note: input,
    };
  }

  if (text.includes('remind me')) {
    const time = parseTime(text);
    return {
      intent: 'addReminder',
      date,
      value: input,
      reminderKind: reminderKind(text),
      ...(time ? { reminderHour: time[0], reminderMinute: time[1] } : {}),
      label: reminderLabel(input),
      requiresConfirmation: true,
      rawText: input,
      note: input,
    };
  }

  if (containsAny(text, ['next period', 'when is my period', 'when should my period'])) {
    return { intent: 'nextPeriodQuery', requiresConfirmation: false, rawText: input };
  }

  if (containsAny(text, ['last six periods', 'period history', 'show my periods'])) {
    return { intent: 'historyQuery', requiresConfirmation: false, rawText: input };
  }

  return { intent: 'unknown', date, requiresConfirmation: true, rawText: input, note: input };
}
