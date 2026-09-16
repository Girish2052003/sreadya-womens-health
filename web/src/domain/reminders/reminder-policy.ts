export type NotificationPrivacy = 'maximum' | 'balanced' | 'detailed';

export type PeriodReminderKind =
  | 'periodSevenDays'
  | 'periodThreeDays'
  | 'periodOneDay'
  | 'periodExpectedDay'
  | 'periodLate';

export type ReminderPolicySettings = {
  enabledOffsetsDays: readonly number[];
  lateDays: number;
  hour: number;
  minute: number;
  privacy: string;
  quietStartHour: number;
  quietEndHour: number;
};

export type ReminderPlan = {
  kind: PeriodReminderKind;
  targetLocal: string;
  privacy: NotificationPrivacy;
};

export type PeriodReminderInput = {
  predictedDate: string;
  sourcePredictionId: string;
  now: string;
  settings: ReminderPolicySettings;
};

const DAY_MS = 86_400_000;

function parseDateOnly(value: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`reminder-v1 requires YYYY-MM-DD: ${value}`);
  const millis = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (new Date(millis).toISOString().slice(0, 10) !== value) {
    throw new Error(`reminder-v1 received an invalid calendar date: ${value}`);
  }
  return millis;
}

function addDays(value: string, days: number): string {
  return new Date(parseDateOnly(value) + days * DAY_MS).toISOString().slice(0, 10);
}

function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

function privacy(value: string): NotificationPrivacy {
  if (value === 'maximum' || value === 'balanced' || value === 'detailed') return value;
  throw new Error(`unsupported notification privacy level: ${value}`);
}

function kindForOffset(offset: number): PeriodReminderKind | null {
  switch (offset) {
    case 7: return 'periodSevenDays';
    case 3: return 'periodThreeDays';
    case 1: return 'periodOneDay';
    case 0: return 'periodExpectedDay';
    default: return null;
  }
}

function quietAdjustedTime(settings: ReminderPolicySettings): { hour: number; minute: number } {
  const { hour, minute, quietStartHour, quietEndHour } = settings;
  const wrapsMidnight = quietStartHour > quietEndHour;
  const isQuiet = wrapsMidnight
    ? hour >= quietStartHour || hour < quietEndHour
    : hour >= quietStartHour && hour < quietEndHour;

  return isQuiet ? { hour: quietEndHour, minute: 0 } : { hour, minute };
}

function targetLocal(date: string, settings: ReminderPolicySettings): string {
  const time = quietAdjustedTime(settings);
  return `${date}T${twoDigits(time.hour)}:${twoDigits(time.minute)}`;
}

function wallClockMillis(value: string): number {
  const normalized = value.length === 16 ? `${value}:00` : value;
  const millis = Date.parse(`${normalized}Z`);
  if (!Number.isFinite(millis)) throw new Error(`invalid local wall-clock value: ${value}`);
  return millis;
}

export function planPeriodReminders(input: PeriodReminderInput): ReminderPlan[] {
  // sourcePredictionId is deliberately accepted at the policy boundary so callers
  // can tie regenerated schedules to a prediction generation. The frozen shared
  // vector shape contains only the delivery plan itself.
  if (input.sourcePredictionId.length === 0) throw new Error('sourcePredictionId is required');

  const settings = input.settings;
  const output: ReminderPlan[] = [];
  const offsets = [...settings.enabledOffsetsDays].sort((left, right) => right - left);

  for (const offset of offsets) {
    const kind = kindForOffset(offset);
    if (!kind) continue;
    const candidate = targetLocal(addDays(input.predictedDate, -offset), settings);
    if (wallClockMillis(candidate) <= wallClockMillis(input.now)) continue;
    output.push({ kind, targetLocal: candidate, privacy: privacy(settings.privacy) });
  }

  if (settings.lateDays > 0) {
    const candidate = targetLocal(addDays(input.predictedDate, settings.lateDays), settings);
    if (wallClockMillis(candidate) > wallClockMillis(input.now)) {
      output.push({
        kind: 'periodLate',
        targetLocal: candidate,
        privacy: privacy(settings.privacy),
      });
    }
  }

  return output;
}

export function notificationBody(daysBefore: number, level: string): string {
  const selected = privacy(level);
  if (selected === 'maximum') return 'You have a reminder.';
  if (selected === 'balanced') return 'Your cycle reminder is ready.';

  switch (daysBefore) {
    case 7: return 'Your period may begin in about 7 days.';
    case 3: return 'Your period may begin in about 3 days.';
    case 1: return 'Your period may begin tomorrow.';
    case 0: return 'Your period is expected around today.';
    default: return 'Your health reminder is ready.';
  }
}
