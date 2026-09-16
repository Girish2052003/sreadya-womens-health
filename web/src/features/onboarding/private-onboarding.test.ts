import { afterEach, describe, expect, it, vi } from 'vitest';

import { VaultService } from '../../vault/vault-service';
import type { PersistedVaultRecord, VaultPersistence } from '../../vault/vault-types';
import { continuePrivately } from './private-onboarding';

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

afterEach(() => {
  vi.restoreAllMocks();
});

describe('account-free onboarding', () => {
  it('continues privately by opening only the local vault with no account or network request', async () => {
    const persistence = new MemoryPersistence();
    const vault = new VaultService(persistence);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    expect(vault.isUnlocked).toBe(false);

    const result = await continuePrivately(vault);

    expect(result).toEqual({ mode: 'account-free', account: null });
    expect(vault.isUnlocked).toBe(true);
    expect(persistence.key).not.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
