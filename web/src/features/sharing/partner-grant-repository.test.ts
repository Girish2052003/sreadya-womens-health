import { describe, expect, it } from 'vitest';

import { VaultService } from '../../vault/vault-service';
import type { PersistedVaultRecord, VaultPersistence } from '../../vault/vault-types';
import { createPartnerGrant, revokePartnerGrant } from './partner-sharing';
import { PartnerGrantRepository } from './partner-grant-repository';

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

describe('encrypted partner grant repository', () => {
  it('stores grants encrypted, loads them, and persists revocation', async () => {
    const persistence = new MemoryPersistence();
    const vault = new VaultService(persistence);
    await vault.createOrOpen();
    const repository = new PartnerGrantRepository(vault);
    const grant = createPartnerGrant({
      id: 'grant-private-1',
      categories: ['prediction', 'cyclePhase'],
      createdAt: '2026-09-16T17:00:00.000Z',
    });

    await repository.save(grant);
    await expect(repository.list()).resolves.toEqual([grant]);
    const revoked = revokePartnerGrant(grant, '2026-09-16T17:05:00.000Z');
    await repository.save(revoked);
    await expect(repository.list()).resolves.toEqual([revoked]);

    const serialized = JSON.stringify([...persistence.records.values()]);
    expect(serialized).not.toContain('grant-private-1');
    expect(serialized).not.toContain('prediction');
    expect(serialized).not.toContain('cyclePhase');
  });

  it('rejects malformed stored grants instead of widening permissions', async () => {
    const persistence = new MemoryPersistence();
    const vault = new VaultService(persistence);
    await vault.createOrOpen();
    await vault.write('sharing:partner-grant:bad', {
      id: 'bad',
      categories: ['sexualActivity'],
      createdAt: '2026-09-16T17:00:00.000Z',
    });
    const repository = new PartnerGrantRepository(vault);

    await expect(repository.list()).rejects.toThrow('Invalid partner grant.');
  });
});
