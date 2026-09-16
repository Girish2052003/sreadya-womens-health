import { describe, expect, it } from 'vitest';

import { VaultService } from '../../vault/vault-service';
import type { PersistedVaultRecord, VaultPersistence } from '../../vault/vault-types';
import { LifeStageSettingsRepository } from './life-stage-settings-repository';

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

describe('encrypted life-stage settings', () => {
  it('defaults to cycle tracking and persists the selected mode without plaintext leakage', async () => {
    const persistence = new MemoryPersistence();
    const vault = new VaultService(persistence);
    await vault.createOrOpen();
    const repository = new LifeStageSettingsRepository(vault);

    await expect(repository.load()).resolves.toBe('cycleTracking');
    await repository.save('pregnancy');
    await expect(repository.load()).resolves.toBe('pregnancy');

    const serialized = JSON.stringify([...persistence.records.values()]);
    expect(serialized).not.toContain('pregnancy');
    expect(serialized).not.toContain('cycleTracking');
  });

  it('rejects unsupported stored values instead of guessing a life stage', async () => {
    const persistence = new MemoryPersistence();
    const vault = new VaultService(persistence);
    await vault.createOrOpen();
    await vault.write('preferences:life-stage:v1', 'invented-stage');
    const repository = new LifeStageSettingsRepository(vault);

    await expect(repository.load()).rejects.toThrow('Invalid life-stage preference.');
  });
});
