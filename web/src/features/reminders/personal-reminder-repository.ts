import type { VaultService } from '../../vault/vault-service';

const RECORD_ID = 'preferences:personal-reminders:v1';

export const PERSONAL_REMINDER_KINDS = [
  'medication',
  'contraception',
  'supplement',
  'ovulationTest',
  'pregnancyTest',
  'custom',
] as const;

export type PersonalReminderKind = (typeof PERSONAL_REMINDER_KINDS)[number];

export type PersonalReminder = {
  id: string;
  kind: PersonalReminderKind;
  label: string;
  hour: number;
  minute: number;
  date?: string;
  enabled: boolean;
  snoozeMinutes: number;
  snoozedUntil?: string;
  timeZone: string;
  createdAt: string;
};

function valid(value: unknown): value is PersonalReminder {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<PersonalReminder>;
  return typeof item.id === 'string'
    && PERSONAL_REMINDER_KINDS.includes(item.kind as PersonalReminderKind)
    && typeof item.label === 'string'
    && item.label.length > 0
    && Number.isInteger(item.hour) && (item.hour ?? -1) >= 0 && (item.hour ?? 24) <= 23
    && Number.isInteger(item.minute) && (item.minute ?? -1) >= 0 && (item.minute ?? 60) <= 59
    && typeof item.enabled === 'boolean'
    && Number.isInteger(item.snoozeMinutes)
    && typeof item.timeZone === 'string'
    && typeof item.createdAt === 'string';
}

export class PersonalReminderRepository {
  constructor(private readonly vault: VaultService) {}

  async list(): Promise<PersonalReminder[]> {
    const ids = await this.vault.listRecordIds();
    if (!ids.includes(RECORD_ID)) return [];
    const stored = await this.vault.read<unknown>(RECORD_ID);
    if (!Array.isArray(stored) || stored.some((item) => !valid(item))) throw new Error('Invalid personal reminder settings.');
    return stored;
  }

  async save(reminder: PersonalReminder): Promise<void> {
    if (!valid(reminder)) throw new Error('Invalid personal reminder.');
    const current = await this.list();
    const next = [...current.filter((item) => item.id !== reminder.id), reminder];
    await this.vault.write(RECORD_ID, next);
  }

  async delete(id: string): Promise<void> {
    const current = await this.list();
    await this.vault.write(RECORD_ID, current.filter((item) => item.id !== id));
  }

  async snooze(id: string, now = new Date()): Promise<void> {
    const current = await this.list();
    const item = current.find((candidate) => candidate.id === id);
    if (!item) throw new Error('Personal reminder not found.');
    const until = new Date(now.getTime() + item.snoozeMinutes * 60_000).toISOString();
    await this.save({ ...item, snoozedUntil: until });
  }
}
