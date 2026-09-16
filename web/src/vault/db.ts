import Dexie, { type Table } from 'dexie';

import type { PersistedVaultRecord, VaultPersistence } from './vault-types';

type StoredVaultKey = {
  id: 'primary';
  key: CryptoKey;
};

export class SrevaVaultDatabase extends Dexie {
  records!: Table<PersistedVaultRecord, string>;
  keys!: Table<StoredVaultKey, string>;

  constructor(name = 'sreva-vault-v1') {
    super(name);
    this.version(1).stores({
      records: '&id',
      keys: '&id',
    });
  }
}

export class DexieVaultPersistence implements VaultPersistence {
  constructor(readonly db = new SrevaVaultDatabase()) {}

  async getRecord(id: string) {
    return this.db.records.get(id);
  }

  async putRecord(record: PersistedVaultRecord) {
    await this.db.records.put(record);
  }

  async deleteRecord(id: string) {
    await this.db.records.delete(id);
  }

  async listRecords() {
    return this.db.records.toArray();
  }

  async getStoredKey() {
    return (await this.db.keys.get('primary'))?.key ?? null;
  }

  async putStoredKey(key: CryptoKey) {
    await this.db.keys.put({ id: 'primary', key });
  }

  async replaceRecordsAtomically(removeIds: string[], replacements: PersistedVaultRecord[]) {
    await this.db.transaction('rw', this.db.records, async () => {
      if (removeIds.length > 0) await this.db.records.bulkDelete(removeIds);
      if (replacements.length > 0) await this.db.records.bulkPut(replacements);
    });
  }
}
