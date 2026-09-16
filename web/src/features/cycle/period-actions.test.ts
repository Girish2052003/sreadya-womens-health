import { beforeEach, describe, expect, it } from 'vitest';

import { HealthVaultRepository } from '../../vault/health-repository';
import { VaultService } from '../../vault/vault-service';
import type { PersistedVaultRecord, VaultPersistence } from '../../vault/vault-types';
import { PeriodActions } from './period-actions';

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

describe('period actions', () => {
  let repository: HealthVaultRepository;

  beforeEach(async () => {
    const vault = new VaultService(new MemoryPersistence());
    await vault.createOrOpen();
    repository = new HealthVaultRepository(vault);
  });

  it('supports start, end, backdate, edit, and delete through the canonical repository', async () => {
    const actions = new PeriodActions(repository, () => 'period-1');

    await actions.startPeriod('2026-09-10T00:00:00.000Z');
    await expect(repository.listPeriods()).resolves.toEqual([{
      id: 'period-1',
      start: '2026-09-10T00:00:00.000Z',
      source: 'app',
    }]);

    await actions.endPeriod('period-1', '2026-09-12T00:00:00.000Z');
    expect((await repository.listPeriods())[0]?.end).toBe('2026-09-12T00:00:00.000Z');

    await actions.backdatePeriod('period-1', '2026-09-09T00:00:00.000Z');
    expect((await repository.listPeriods())[0]?.start).toBe('2026-09-09T00:00:00.000Z');

    await actions.editPeriod('period-1', {
      start: '2026-09-08T00:00:00.000Z',
      end: '2026-09-11T00:00:00.000Z',
    });
    await expect(repository.listPeriods()).resolves.toEqual([{
      id: 'period-1',
      start: '2026-09-08T00:00:00.000Z',
      end: '2026-09-11T00:00:00.000Z',
      source: 'app',
    }]);

    await actions.deletePeriod('period-1');
    await expect(repository.listPeriods()).resolves.toEqual([]);
  });
});
