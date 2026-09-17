import Dexie, { type Table } from 'dexie';

import { decryptSyncEvent, type WireSyncEvent } from './event-crypto';

export type SyncConflictReason = 'server-conflict' | 'stale-base' | 'missing-predecessor';

export type PreservedSyncConflict = {
  event: WireSyncEvent;
  reason: SyncConflictReason;
};

export interface VaultRootSecretProvider {
  getVaultRootSecret(vaultId: string, keyEpoch: number): Promise<Uint8Array<ArrayBuffer>>;
}

export interface SyncPlaintextValidator {
  validate(schemaId: string, value: unknown): Promise<void>;
}

export interface LocalSyncApplyTarget {
  getRevision(objectId: string): Promise<number | null>;
  applyRemote(event: WireSyncEvent, value: unknown): Promise<void>;
}

export interface SyncConflictStore {
  preserve(conflict: PreservedSyncConflict): Promise<void>;
  list(): Promise<PreservedSyncConflict[]>;
  clear(): Promise<void>;
}

type StoredConflict = PreservedSyncConflict & {
  id: string;
  vaultId: string;
  objectId: string;
};

class SrevaSyncConflictDatabase extends Dexie {
  conflicts!: Table<StoredConflict, string>;

  constructor(name = 'sreva-sync-conflicts-v1') {
    super(name);
    this.version(1).stores({
      conflicts: '&id,vaultId,objectId',
    });
  }
}

function cloneEvent(event: WireSyncEvent): WireSyncEvent {
  return structuredClone(event);
}

function cloneConflict(conflict: PreservedSyncConflict): PreservedSyncConflict {
  return { event: cloneEvent(conflict.event), reason: conflict.reason };
}

export class DexieSyncConflictStore implements SyncConflictStore {
  constructor(readonly db = new SrevaSyncConflictDatabase()) {}

  async preserve(conflict: PreservedSyncConflict): Promise<void> {
    const value = cloneConflict(conflict);
    await this.db.conflicts.put({
      id: `${value.event.vault_id}:${value.event.event_id}`,
      vaultId: value.event.vault_id,
      objectId: value.event.object_id,
      ...value,
    });
  }

  async list(): Promise<PreservedSyncConflict[]> {
    return (await this.db.conflicts.toArray()).map(({ event, reason }) => ({
      event: cloneEvent(event),
      reason,
    }));
  }

  async clear(): Promise<void> {
    await this.db.conflicts.clear();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: Record<string, unknown>, key: string): string {
  const candidate = value[key];
  if (typeof candidate !== 'string' || candidate.length === 0) {
    throw new Error('Invalid Sreva remote sync event.');
  }
  return candidate;
}

function requiredInteger(value: Record<string, unknown>, key: string, minimum: number): number {
  const candidate = value[key];
  if (!Number.isSafeInteger(candidate) || (candidate as number) < minimum) {
    throw new Error('Invalid Sreva remote sync event.');
  }
  return candidate as number;
}

function parseWireSyncEvent(value: unknown): WireSyncEvent {
  if (!isRecord(value)) throw new Error('Invalid Sreva remote sync event.');
  const operation = requiredString(value, 'operation');
  if (operation !== 'upsert' && operation !== 'tombstone') {
    throw new Error('Invalid Sreva remote sync event.');
  }
  if (typeof value.conflict !== 'boolean') throw new Error('Invalid Sreva remote sync event.');

  const event: WireSyncEvent = {
    protocol_version: requiredInteger(value, 'protocol_version', 1),
    suite_id: requiredString(value, 'suite_id'),
    account_id: requiredString(value, 'account_id'),
    vault_id: requiredString(value, 'vault_id'),
    key_epoch: requiredInteger(value, 'key_epoch', 0),
    object_id: requiredString(value, 'object_id'),
    event_id: requiredString(value, 'event_id'),
    source_device_id: requiredString(value, 'source_device_id'),
    schema_id: requiredString(value, 'schema_id'),
    base_revision: requiredInteger(value, 'base_revision', 0),
    operation,
    kdf_salt: requiredString(value, 'kdf_salt'),
    nonce: requiredString(value, 'nonce'),
    ciphertext_and_tag: requiredString(value, 'ciphertext_and_tag'),
    committed_revision: requiredInteger(value, 'committed_revision', 1),
    conflict: value.conflict,
  };
  if (event.committed_revision <= event.base_revision) {
    throw new Error('Invalid Sreva remote revision transition.');
  }
  return event;
}

export class ConflictAwareRemoteEventApplier {
  constructor(
    private readonly dependencies: {
      rootSecrets: VaultRootSecretProvider;
      validator: SyncPlaintextValidator;
      local: LocalSyncApplyTarget;
      conflicts: SyncConflictStore;
    },
  ) {}

  async apply(input: unknown): Promise<'applied' | 'conflict-preserved'> {
    const event = parseWireSyncEvent(input);
    const rootSecret = await this.dependencies.rootSecrets.getVaultRootSecret(event.vault_id, event.key_epoch);
    const plaintext = await decryptSyncEvent(rootSecret, event);
    await this.dependencies.validator.validate(event.schema_id, plaintext);

    const localRevision = await this.dependencies.local.getRevision(event.object_id);
    const expectedBase = localRevision ?? 0;

    if (event.conflict) {
      await this.preserve(event, 'server-conflict');
      return 'conflict-preserved';
    }
    if (event.base_revision < expectedBase) {
      await this.preserve(event, 'stale-base');
      return 'conflict-preserved';
    }
    if (event.base_revision > expectedBase) {
      await this.preserve(event, 'missing-predecessor');
      return 'conflict-preserved';
    }

    await this.dependencies.local.applyRemote(event, plaintext);
    return 'applied';
  }

  private async preserve(event: WireSyncEvent, reason: SyncConflictReason): Promise<void> {
    await this.dependencies.conflicts.preserve({ event: cloneEvent(event), reason });
  }
}
