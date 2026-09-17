import { deriveSyncEventKey, syncEventAad, SYNC_SUITE_V1, type SyncEventCryptoContext } from './event-crypto';
import { SyncQueue, SyncQueueEventConflictError } from './queue';

const encoder = new TextEncoder();

export interface OutgoingVaultRootSecretProvider {
  getVaultRootSecret(vaultId: string, keyEpoch: number): Promise<Uint8Array<ArrayBuffer>>;
}

export interface OutgoingSyncRandomSource {
  eventId(): string;
  salt(): Uint8Array<ArrayBuffer>;
  nonce(): Uint8Array<ArrayBuffer>;
  now(): Date;
}

export type CommittedSyncChangeMetadata = {
  accountId: string;
  vaultId: string;
  keyEpoch: number;
  objectId: string;
  sourceDeviceId: string;
  schemaId: string;
  baseRevision: number;
  operation: 'upsert' | 'tombstone';
};

type EncryptedSyncOutboxOptions = {
  queue: SyncQueue;
  rootSecrets: OutgoingVaultRootSecretProvider;
  random: OutgoingSyncRandomSource;
};

type OutgoingWireEnvelope = {
  protocol_version: number;
  suite_id: string;
  account_id: string;
  vault_id: string;
  key_epoch: number;
  object_id: string;
  event_id: string;
  source_device_id: string;
  schema_id: string;
  base_revision: number;
  operation: 'upsert' | 'tombstone';
  kdf_salt: string;
  nonce: string;
  ciphertext_and_tag: string;
  created_at: string;
};

function bytesToBase64(value: Uint8Array<ArrayBuffer>): string {
  return btoa(String.fromCharCode(...value));
}

function assertMetadata(metadata: CommittedSyncChangeMetadata): void {
  if (
    metadata.accountId.length === 0 ||
    metadata.vaultId.length === 0 ||
    metadata.objectId.length === 0 ||
    metadata.sourceDeviceId.length === 0 ||
    metadata.schemaId.length === 0 ||
    !Number.isSafeInteger(metadata.keyEpoch) ||
    metadata.keyEpoch < 0 ||
    !Number.isSafeInteger(metadata.baseRevision) ||
    metadata.baseRevision < 0 ||
    (metadata.operation !== 'upsert' && metadata.operation !== 'tombstone')
  ) {
    throw new Error('Invalid committed sync change metadata.');
  }
}

export class EncryptedSyncOutbox {
  private readonly queue: SyncQueue;
  private readonly rootSecrets: OutgoingVaultRootSecretProvider;
  private readonly random: OutgoingSyncRandomSource;

  constructor(options: EncryptedSyncOutboxOptions) {
    this.queue = options.queue;
    this.rootSecrets = options.rootSecrets;
    this.random = options.random;
  }

  async recordCommittedChange(
    metadata: CommittedSyncChangeMetadata,
    plaintext: unknown,
  ): Promise<{ eventId: string; status: 'queued' | 'existing' }> {
    assertMetadata(metadata);

    const eventId = this.random.eventId();
    const salt = new Uint8Array(this.random.salt());
    const nonce = new Uint8Array(this.random.nonce());
    const createdAt = this.random.now();
    if (eventId.length === 0 || salt.byteLength !== 32 || nonce.byteLength !== 12 || Number.isNaN(createdAt.getTime())) {
      throw new Error('Invalid outgoing sync randomness.');
    }

    const context: SyncEventCryptoContext = {
      protocol_version: 1,
      suite_id: SYNC_SUITE_V1,
      account_id: metadata.accountId,
      vault_id: metadata.vaultId,
      key_epoch: metadata.keyEpoch,
      object_id: metadata.objectId,
      event_id: eventId,
      source_device_id: metadata.sourceDeviceId,
      schema_id: metadata.schemaId,
      base_revision: metadata.baseRevision,
      operation: metadata.operation,
      kdf_salt: bytesToBase64(salt),
      nonce: bytesToBase64(nonce),
    };

    const rootSecret = new Uint8Array(
      await this.rootSecrets.getVaultRootSecret(metadata.vaultId, metadata.keyEpoch),
    );
    const keyBytes = await deriveSyncEventKey(rootSecret, context);
    const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt']);
    const cleartext = encoder.encode(JSON.stringify(plaintext));
    const sealed = new Uint8Array(
      await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: nonce,
          additionalData: syncEventAad(context),
          tagLength: 128,
        },
        key,
        cleartext,
      ),
    );

    const wire: OutgoingWireEnvelope = {
      ...context,
      ciphertext_and_tag: bytesToBase64(sealed),
      created_at: createdAt.toISOString(),
    };
    const body = encoder.encode(JSON.stringify(wire));

    try {
      const status = await this.queue.enqueue({ eventId, vaultId: metadata.vaultId, body });
      return { eventId, status };
    } catch (error) {
      if (error instanceof SyncQueueEventConflictError) {
        throw new Error('Sync event ID is already queued with different bytes.');
      }
      throw error;
    }
  }
}
