import { describe, expect, it } from 'vitest';

import { VaultService } from './vault-service';
import type { PersistedVaultRecord, VaultPersistence } from './vault-types';

class AtomicMemoryPersistence implements VaultPersistence {
  records = new Map<string, PersistedVaultRecord>();
  key: CryptoKey | null = null;
  failNextReplace = false;

  async getRecord(id: string) { return this.records.get(id); }
  async putRecord(record: PersistedVaultRecord) { this.records.set(record.id, structuredClone(record)); }
  async deleteRecord(id: string) { this.records.delete(id); }
  async listRecords() { return [...this.records.values()].map((value) => structuredClone(value)); }
  async getStoredKey() { return this.key; }
  async putStoredKey(key: CryptoKey) { this.key = key; }

  async replaceRecordsAtomically(removeIds: string[], replacements: PersistedVaultRecord[]) {
    const next = new Map([...this.records.entries()].map(([id, value]) => [id, structuredClone(value)]));
    for (const id of removeIds) next.delete(id);
    for (const record of replacements) next.set(record.id, structuredClone(record));
    if (this.failNextReplace) {
      this.failNextReplace = false;
      throw new Error('simulated atomic persistence failure');
    }
    this.records = next;
  }
}

describe('VaultService atomic replacement', () => {
  it('seals all replacements and swaps only the requested records as one operation', async () => {
    const persistence = new AtomicMemoryPersistence();
    const vault = new VaultService(persistence);
    await vault.createOrOpen();
    await vault.write('health:period:old', { secret: 'OLD-HEALTH-SENTINEL' });
    await vault.write('preferences:reminders:v1', { enabledOffsetsDays: [3] });

    await vault.replaceRecordsAtomically(
      ['health:period:old'],
      [{ id: 'health:period:new', value: { secret: 'NEW-HEALTH-SENTINEL' } }],
    );

    await expect(vault.read('health:period:new')).resolves.toEqual({ secret: 'NEW-HEALTH-SENTINEL' });
    await expect(vault.read('health:period:old')).rejects.toThrow('Sreadya vault record not found.');
    await expect(vault.read('preferences:reminders:v1')).resolves.toEqual({ enabledOffsetsDays: [3] });

    const persisted = JSON.stringify([...persistence.records.values()]);
    expect(persisted).not.toContain('NEW-HEALTH-SENTINEL');
    expect(persisted).not.toContain('OLD-HEALTH-SENTINEL');
  });

  it('preserves the previous live records and decrypted cache if atomic persistence fails', async () => {
    const persistence = new AtomicMemoryPersistence();
    const vault = new VaultService(persistence);
    await vault.createOrOpen();
    await vault.write('health:period:old', { version: 'old' });
    await expect(vault.read('health:period:old')).resolves.toEqual({ version: 'old' });

    persistence.failNextReplace = true;
    await expect(vault.replaceRecordsAtomically(
      ['health:period:old'],
      [{ id: 'health:period:new', value: { version: 'new' } }],
    )).rejects.toThrow('simulated atomic persistence failure');

    await expect(vault.read('health:period:old')).resolves.toEqual({ version: 'old' });
    await expect(vault.read('health:period:new')).rejects.toThrow('Sreadya vault record not found.');
  });
});
