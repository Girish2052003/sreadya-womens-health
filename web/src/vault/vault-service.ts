import { generateVaultKey, openJson, sealJson } from '../crypto/webcrypto';
import { VaultLock } from './vault-lock';
import type { PersistedVaultRecord, VaultPersistence } from './vault-types';

export const LOCAL_ONLY_DATA_LOSS_WARNING =
  'Browser site data can be erased by browser cleanup, device reset, private-browsing policy, or storage eviction. Keep an encrypted recovery backup when backup is available.';

function recordAad(id: string) {
  return `sreva:vault:v1:${id}`;
}

export class VaultService {
  private key: CryptoKey | null = null;
  private readonly lockState = new VaultLock();

  constructor(private readonly persistence: VaultPersistence) {}

  get isUnlocked() {
    return this.key !== null && this.lockState.isUnlocked;
  }

  async createOrOpen() {
    const stored = await this.persistence.getStoredKey();
    if (stored) {
      this.key = stored;
    } else {
      this.key = await generateVaultKey();
      await this.persistence.putStoredKey(this.key);
    }
    this.lockState.unlock();
  }

  async openFromStoredKey() {
    const stored = await this.persistence.getStoredKey();
    if (!stored) throw new Error('No authorized local Sreva vault key is available.');
    this.key = stored;
    this.lockState.unlock();
  }

  async write(id: string, value: unknown) {
    const key = this.requireKey();
    const sealed = await sealJson(key, value, recordAad(id));
    await this.persistence.putRecord({ id, sealed });
    this.lockState.remember(id, value);
  }

  async replaceRecordsAtomically(
    removeIds: string[],
    replacements: Array<{ id: string; value: unknown }>,
  ) {
    const key = this.requireKey();
    const replace = this.persistence.replaceRecordsAtomically;
    if (!replace) {
      throw new Error('This Sreva vault persistence does not support atomic replacement.');
    }

    const sealedReplacements: PersistedVaultRecord[] = await Promise.all(
      replacements.map(async ({ id, value }) => ({
        id,
        sealed: await sealJson(key, value, recordAad(id)),
      })),
    );

    await replace.call(this.persistence, removeIds, sealedReplacements);

    for (const id of removeIds) this.lockState.forget(id);
    for (const { id, value } of replacements) this.lockState.remember(id, value);
  }

  async read<T>(id: string): Promise<T> {
    const key = this.requireKey();
    const remembered = this.lockState.peek<T>(id);
    if (remembered !== undefined) return remembered;

    const persisted = await this.persistence.getRecord(id);
    if (!persisted) throw new Error('Sreva vault record not found.');

    const clear = await openJson<T>(key, persisted.sealed, recordAad(id));
    this.lockState.remember(id, clear);
    return clear;
  }

  async delete(id: string) {
    this.requireKey();
    await this.persistence.deleteRecord(id);
    this.lockState.forget(id);
  }

  async listRecordIds() {
    this.requireKey();
    return (await this.persistence.listRecords()).map((record) => record.id);
  }

  lock() {
    this.key = null;
    this.lockState.lock();
  }

  private requireKey(): CryptoKey {
    if (!this.key || !this.lockState.isUnlocked) throw new Error('Sreva vault is locked.');
    return this.key;
  }
}
