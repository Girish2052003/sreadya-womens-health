import { beforeEach, describe, expect, it } from 'vitest';

import { OBSERVATION_KINDS } from '../../domain/cycle/types';
import { HealthVaultRepository } from '../../vault/health-repository';
import { VaultService } from '../../vault/vault-service';
import type { PersistedVaultRecord, VaultPersistence } from '../../vault/vault-types';
import { ObservationActions } from './observation-actions';

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

describe('observation actions', () => {
  let repository: HealthVaultRepository;

  beforeEach(async () => {
    const vault = new VaultService(new MemoryPersistence());
    await vault.createOrOpen();
    repository = new HealthVaultRepository(vault);
  });

  it('logs, edits, and deletes every canonical observation kind through the encrypted repository', async () => {
    let nextId = 0;
    const actions = new ObservationActions(repository, () => `observation-${nextId++}`);

    expect(OBSERVATION_KINDS).toHaveLength(36);

    for (const [index, kind] of OBSERVATION_KINDS.entries()) {
      const id = await actions.logObservation({
        kind,
        occurredAt: '2026-09-16T09:00:00.000Z',
        note: `initial-${kind}`,
      });

      expect(id).toBe(`observation-${index}`);
      expect((await repository.listObservations()).find((item) => item.id === id)).toEqual({
        id,
        kind,
        occurredAt: '2026-09-16T09:00:00.000Z',
        note: `initial-${kind}`,
        source: 'app',
      });

      await actions.editObservation(id, {
        note: `edited-${kind}`,
        severity: 'mild',
      });

      expect((await repository.listObservations()).find((item) => item.id === id)).toEqual({
        id,
        kind,
        occurredAt: '2026-09-16T09:00:00.000Z',
        note: `edited-${kind}`,
        severity: 'mild',
        source: 'app',
      });

      await actions.deleteObservation(id);
      expect((await repository.listObservations()).some((item) => item.id === id)).toBe(false);
    }

    await expect(repository.listObservations()).resolves.toEqual([]);
  });
});
