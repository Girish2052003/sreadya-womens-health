import type { NotificationPrivacy, ReminderPolicySettings } from '../../domain/reminders/reminder-policy';
import type { VaultService } from '../../vault/vault-service';

const REMINDER_SETTINGS_ID = 'preferences:reminders:v1';
const SUPPORTED_OFFSETS = new Set([7, 3, 1, 0]);

export const DEFAULT_REMINDER_SETTINGS: ReminderPolicySettings = Object.freeze({
  enabledOffsetsDays: [],
  lateDays: 0,
  hour: 8,
  minute: 0,
  privacy: 'maximum',
  quietStartHour: 22,
  quietEndHour: 7,
});

function isPrivacy(value: unknown): value is NotificationPrivacy {
  return value === 'maximum' || value === 'balanced' || value === 'detailed';
}

function assertSettings(value: unknown): asserts value is ReminderPolicySettings {
  if (!value || typeof value !== 'object') throw new Error('Invalid reminder settings.');
  const settings = value as Record<string, unknown>;
  if (!Array.isArray(settings.enabledOffsetsDays)
    || settings.enabledOffsetsDays.some((item) => typeof item !== 'number' || !SUPPORTED_OFFSETS.has(item))) {
    throw new Error('Invalid reminder offsets.');
  }
  const numericKeys = ['lateDays', 'hour', 'minute', 'quietStartHour', 'quietEndHour'] as const;
  for (const key of numericKeys) {
    if (!Number.isInteger(settings[key])) throw new Error(`Invalid reminder setting: ${key}`);
  }
  if ((settings.lateDays as number) < 0 || (settings.lateDays as number) > 30) throw new Error('Invalid late reminder offset.');
  if ((settings.hour as number) < 0 || (settings.hour as number) > 23) throw new Error('Invalid reminder hour.');
  if ((settings.minute as number) < 0 || (settings.minute as number) > 59) throw new Error('Invalid reminder minute.');
  if ((settings.quietStartHour as number) < 0 || (settings.quietStartHour as number) > 23) throw new Error('Invalid quiet-start hour.');
  if ((settings.quietEndHour as number) < 0 || (settings.quietEndHour as number) > 23) throw new Error('Invalid quiet-end hour.');
  if (!isPrivacy(settings.privacy)) throw new Error('Invalid notification privacy level.');
}

export class ReminderSettingsRepository {
  constructor(private readonly vault: VaultService) {}

  async load(): Promise<ReminderPolicySettings> {
    const ids = await this.vault.listRecordIds();
    if (!ids.includes(REMINDER_SETTINGS_ID)) {
      return { ...DEFAULT_REMINDER_SETTINGS, enabledOffsetsDays: [] };
    }
    const stored = await this.vault.read<unknown>(REMINDER_SETTINGS_ID);
    assertSettings(stored);
    return {
      ...stored,
      enabledOffsetsDays: [...stored.enabledOffsetsDays],
    };
  }

  async save(settings: ReminderPolicySettings): Promise<void> {
    assertSettings(settings);
    await this.vault.write(REMINDER_SETTINGS_ID, {
      ...settings,
      enabledOffsetsDays: [...settings.enabledOffsetsDays],
    });
  }
}
