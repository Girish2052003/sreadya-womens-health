import { describe, expect, it } from 'vitest';

import { VaultService } from './vault-service';
import type { PersistedVaultRecord, VaultPersistence } from './vault-types';
import { HealthVaultRepository } from './health-repository';

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

describe('encrypted health repository', () => {
  it('supports period save, same-id update, distinct overlap rejection, and delete', async () => {
    const persistence = new MemoryPersistence();
    const vault = new VaultService(persistence);
    await vault.createOrOpen();
    const repository = new HealthVaultRepository(vault);

    const first = {
      id: 'period-1',
      start: '2026-09-10T00:00:00.000Z',
      end: '2026-09-12T00:00:00.000Z',
      source: 'app' as const,
    };
    await repository.savePeriod(first);
    await expect(repository.listPeriods()).resolves.toEqual([first]);

    const updated = { ...first, end: '2026-09-13T00:00:00.000Z' };
    await repository.savePeriod(updated);
    await expect(repository.listPeriods()).resolves.toEqual([updated]);

    await expect(repository.savePeriod({
      id: 'period-2',
      start: '2026-09-13T00:00:00.000Z',
      end: '2026-09-14T00:00:00.000Z',
      source: 'app',
    })).rejects.toThrow('Period episodes cannot overlap without an explicit merge.');

    await repository.deletePeriod(first.id);
    await expect(repository.listPeriods()).resolves.toEqual([]);
  });
});
