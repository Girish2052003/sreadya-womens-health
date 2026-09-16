import { describe, expect, it } from 'vitest';

import { generateVaultKey, openJson, sealJson } from '../crypto/webcrypto';
import { VaultLock } from './vault-lock';
import { LOCAL_ONLY_DATA_LOSS_WARNING, VaultService } from './vault-service';
import type { PersistedVaultRecord, VaultPersistence } from './vault-types';

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

describe('browser health vault', () => {
  it('persists ciphertext without known health plaintext and reopens through the authorized stored key path', async () => {
    const persistence = new MemoryPersistence();
    const service = new VaultService(persistence);
    await service.createOrOpen();

    const clear = {
      periodStart: '2099-12-31',
      note: 'KNOWN-PLAINTEXT-SENTINEL',
      flow: 'heavy',
    };
    await service.write('period-1', clear);

    const raw = JSON.stringify(persistence.records.get('period-1'));
    expect(raw).not.toContain('2099-12-31');
    expect(raw).not.toContain('KNOWN-PLAINTEXT-SENTINEL');
    expect(raw).not.toContain('heavy');
    await expect(service.read<typeof clear>('period-1')).resolves.toEqual(clear);

    service.lock();
    expect(service.isUnlocked).toBe(false);

    const reopened = new VaultService(persistence);
    await reopened.openFromStoredKey();
    await expect(reopened.read<typeof clear>('period-1')).resolves.toEqual(clear);
  });

  it('fails closed for tampered ciphertext and a wrong key', async () => {
    const key = await generateVaultKey();
    const envelope = await sealJson(key, { symptom: 'sentinel' }, 'sreva:vault:v1:test');
    const tampered = structuredClone(envelope);
    tampered.ciphertext = `${tampered.ciphertext.slice(0, -2)}AA`;

    await expect(openJson(key, tampered, 'sreva:vault:v1:test')).rejects.toThrow();
    const wrongKey = await generateVaultKey();
    await expect(openJson(wrongKey, envelope, 'sreva:vault:v1:test')).rejects.toThrow();
  });

  it('lock clears decrypted application state', () => {
    const lock = new VaultLock();
    lock.remember('record-1', { note: 'secret' });
    expect(lock.peek('record-1')).toEqual({ note: 'secret' });
    lock.lock();
    expect(lock.peek('record-1')).toBeUndefined();
    expect(lock.isUnlocked).toBe(false);
  });

  it('ships an explicit local-only site-data-loss warning', () => {
    expect(LOCAL_ONLY_DATA_LOSS_WARNING).toMatch(/browser site data/i);
    expect(LOCAL_ONLY_DATA_LOSS_WARNING).toMatch(/backup/i);
  });
});
