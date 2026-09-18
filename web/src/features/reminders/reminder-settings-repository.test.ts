import { describe, expect, it } from 'vitest';

import type { PersistedVaultRecord, VaultPersistence } from '../../vault/vault-types';
import { VaultService } from '../../vault/vault-service';
import { DEFAULT_REMINDER_SETTINGS, ReminderSettingsRepository } from './reminder-settings-repository';

class MemoryPersistence implements VaultPersistence {
  records = new Map<string, PersistedVaultRecord>();
  key: CryptoKey | null = null;
  async getRecord(id: string) { return this.records.get(id); }
  async putRecord(record: PersistedVaultRecord) { this.records.set(record.id, structuredClone(record)); }
  async deleteRecord(id: string) { this.records.delete(id); }
  async listRecords() { return [...this.records.values()].map((value) => structuredClone(value)); }
  async getStoredKey() { return this.key; }
  async putStoredKey(key: CryptoKey) { this.key = key; }
}

describe('encrypted reminder settings', () => {
  it('enables the frozen private 3-day default and persists health-revealing reminder preferences as ciphertext', async () => {
    const persistence = new MemoryPersistence();
    const vault = new VaultService(persistence);
    await vault.createOrOpen();
    const repository = new ReminderSettingsRepository(vault);

    await expect(repository.load()).resolves.toEqual(DEFAULT_REMINDER_SETTINGS);
    expect(DEFAULT_REMINDER_SETTINGS.enabledOffsetsDays).toEqual([3]);

    const settings = {
      ...DEFAULT_REMINDER_SETTINGS,
      enabledOffsetsDays: [3],
      lateDays: 2,
      privacy: 'maximum' as const,
    };
    await repository.save(settings);
    await expect(repository.load()).resolves.toEqual(settings);

    const raw = JSON.stringify([...persistence.records.values()]);
    expect(raw).not.toContain('enabledOffsetsDays');
    expect(raw).not.toContain('lateDays');
  });
});
