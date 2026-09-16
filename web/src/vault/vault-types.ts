export type VaultEnvelopeV1 = {
  version: 1;
  algorithm: 'AES-GCM';
  nonce: string;
  aad: string;
  ciphertext: string;
};

export type PersistedVaultRecord = {
  id: string;
  sealed: VaultEnvelopeV1;
};

export interface VaultPersistence {
  getRecord(id: string): Promise<PersistedVaultRecord | undefined>;
  putRecord(record: PersistedVaultRecord): Promise<void>;
  deleteRecord(id: string): Promise<void>;
  listRecords(): Promise<PersistedVaultRecord[]>;
  getStoredKey(): Promise<CryptoKey | null>;
  putStoredKey(key: CryptoKey): Promise<void>;
}
