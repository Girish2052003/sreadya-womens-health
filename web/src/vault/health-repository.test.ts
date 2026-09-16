import { describe, expect, it } from 'vitest';

import type { HealthObservation } from '../domain/cycle/types';
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

  it('supports observation save, inclusive range filtering, same-id update, provenance, and delete', async () => {
    const persistence = new MemoryPersistence();
    const vault = new VaultService(persistence);
    await vault.createOrOpen();
    const repository = new HealthVaultRepository(vault);

    const first = {
      id: 'observation-1',
      kind: 'dailyNote' as const,
      occurredAt: '2026-09-16T08:00:00.000Z',
      source: 'healthConnect' as const,
      note: 'initial',
    };
    const outside = {
      id: 'observation-2',
      kind: 'cramps' as const,
      occurredAt: '2026-09-17T08:00:00.000Z',
      source: 'app' as const,
      severity: 'moderate' as const,
    };

    await repository.saveObservation(first);
    await repository.saveObservation(outside);

    await expect(repository.listObservations({
      from: '2026-09-16T08:00:00.000Z',
      to: '2026-09-16T08:00:00.000Z',
    })).resolves.toEqual([first]);

    const updated = { ...first, note: 'updated' };
    await repository.saveObservation(updated);
    await expect(repository.listObservations()).resolves.toEqual([updated, outside]);

    await repository.deleteObservation(first.id);
    await expect(repository.listObservations()).resolves.toEqual([outside]);
  });

  it('rejects observations outside the frozen v1 kind, UTC, and provenance contract', async () => {
    const persistence = new MemoryPersistence();
    const vault = new VaultService(persistence);
    await vault.createOrOpen();
    const repository = new HealthVaultRepository(vault);

    const invalidKind = {
      id: 'observation-invalid-kind',
      kind: 'inventedSymptom',
      occurredAt: '2026-09-16T08:00:00.000Z',
      source: 'app',
    } as unknown as HealthObservation;
    await expect(repository.saveObservation(invalidKind))
      .rejects.toThrow('Health observation does not conform to Sreva HealthObservation v1 schema.');

    const invalidTimestamp = {
      id: 'observation-invalid-time',
      kind: 'dailyNote',
      occurredAt: '2026-09-16T08:00:00+03:00',
      source: 'app',
    } as unknown as HealthObservation;
    await expect(repository.saveObservation(invalidTimestamp))
      .rejects.toThrow('Health observation does not conform to Sreva HealthObservation v1 schema.');

    const invalidSource = {
      id: 'observation-invalid-source',
      kind: 'dailyNote',
      occurredAt: '2026-09-16T08:00:00.000Z',
      source: 'remoteApi',
    } as unknown as HealthObservation;
    await expect(repository.saveObservation(invalidSource))
      .rejects.toThrow('Health observation does not conform to Sreva HealthObservation v1 schema.');

    expect(persistence.records.size).toBe(0);
  });

  it('keeps repository health payloads out of persisted IndexedDB-style records and keys', async () => {
    const persistence = new MemoryPersistence();
    const vault = new VaultService(persistence);
    await vault.createOrOpen();
    const repository = new HealthVaultRepository(vault);
    const sentinel = 'SREVA-PRIVATE-HEALTH-SENTINEL-9A7C';

    await repository.savePeriod({
      id: 'period-ciphertext-proof',
      start: '2026-09-01T00:00:00.000Z',
      end: '2026-09-03T00:00:00.000Z',
      source: 'app',
    });
    await repository.saveObservation({
      id: 'observation-ciphertext-proof',
      kind: 'dailyNote',
      occurredAt: '2026-09-02T09:00:00.000Z',
      source: 'app',
      note: sentinel,
    });

    const persistedRecords = JSON.stringify([...persistence.records.values()]);
    const persistedKeys = [...persistence.records.keys()].join('|');

    expect(persistedRecords).not.toContain(sentinel);
    expect(persistedRecords).not.toContain('2026-09-01T00:00:00.000Z');
    expect(persistedRecords).not.toContain('2026-09-02T09:00:00.000Z');
    expect(persistedKeys).not.toContain(sentinel);
    expect(persistedKeys).not.toContain('2026-09-01T00:00:00.000Z');
    expect(persistedKeys).not.toContain('2026-09-02T09:00:00.000Z');
  });
});
