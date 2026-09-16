import { beforeEach, describe, expect, it } from 'vitest';

import { HealthVaultRepository } from '../../vault/health-repository';
import { VaultService } from '../../vault/vault-service';
import type { PersistedVaultRecord, VaultPersistence } from '../../vault/vault-types';
import { CalendarHistory } from './calendar-history';

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

describe('calendar history', () => {
  let repository: HealthVaultRepository;

  beforeEach(async () => {
    const vault = new VaultService(new MemoryPersistence());
    await vault.createOrOpen();
    repository = new HealthVaultRepository(vault);

    await repository.savePeriod({ id: 'p-2025', start: '2025-12-02T00:00:00.000Z', end: '2025-12-05T00:00:00.000Z', source: 'app' });
    await repository.savePeriod({ id: 'p-sep-early', start: '2026-09-02T00:00:00.000Z', end: '2026-09-04T00:00:00.000Z', source: 'app' });
    await repository.savePeriod({ id: 'p-sep-late', start: '2026-09-20T00:00:00.000Z', end: '2026-09-22T00:00:00.000Z', source: 'app' });
    await repository.savePeriod({ id: 'p-oct', start: '2026-10-03T00:00:00.000Z', source: 'app' });
  });

  it('mirrors mobile month, timeline, and year history ordering', async () => {
    const history = new CalendarHistory(repository);

    expect((await history.month(2026, 9)).map((period) => period.id)).toEqual([
      'p-sep-late',
      'p-sep-early',
    ]);

    expect((await history.timeline()).map((period) => period.id)).toEqual([
      'p-oct',
      'p-sep-late',
      'p-sep-early',
      'p-2025',
    ]);

    const years = await history.year();
    expect(years.map((group) => group.year)).toEqual([2026, 2025]);
    expect(years[0]?.periods.map((period) => period.id)).toEqual([
      'p-sep-early',
      'p-sep-late',
      'p-oct',
    ]);
    expect(years[1]?.periods.map((period) => period.id)).toEqual(['p-2025']);
  });
});
