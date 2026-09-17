import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { type WireSyncEvent } from './event-crypto';
import {
  ConflictAwareRemoteEventApplier,
  type LocalSyncApplyTarget,
  type PreservedSyncConflict,
  type SyncConflictStore,
  type SyncPlaintextValidator,
  type VaultRootSecretProvider,
} from './reconcile';

type VectorFile = {
  suiteId: string;
  common: {
    accountId: string;
    vaultId: string;
    keyEpoch: number;
    vaultRootSecretHex: string;
  };
  syncEvent: {
    eventId: string;
    objectId: string;
    sourceDeviceId: string;
    schema: string;
    baseRevision: number;
    operation: 'upsert' | 'tombstone';
    saltHex: string;
    nonceHex: string;
    ciphertextAndTagHex: string;
    plaintextUtf8: string;
  };
};

type ConflictVectorFile = {
  cases: Array<{
    id: string;
    expected: Record<string, unknown>;
  }>;
};

function bytes(hexValue: string): Uint8Array<ArrayBuffer> {
  const output = new Uint8Array(hexValue.length / 2);
  for (let index = 0; index < output.length; index += 1) {
    output[index] = Number.parseInt(hexValue.slice(index * 2, index * 2 + 2), 16);
  }
  return output;
}

function base64(value: Uint8Array<ArrayBuffer>): string {
  return btoa(String.fromCharCode(...value));
}

async function loadVector(): Promise<VectorFile> {
  const path = resolve(process.cwd(), '../shared/crypto/interoperability-vectors/e2ee-v1.json');
  return JSON.parse(await readFile(path, 'utf8')) as VectorFile;
}

async function loadConflictVectors(): Promise<ConflictVectorFile> {
  const path = resolve(process.cwd(), '../shared/sync/conflict-vectors/v1.json');
  return JSON.parse(await readFile(path, 'utf8')) as ConflictVectorFile;
}

function wireFromVector(vector: VectorFile): WireSyncEvent {
  const entry = vector.syncEvent;
  return {
    protocol_version: 1,
    suite_id: vector.suiteId,
    account_id: vector.common.accountId,
    vault_id: vector.common.vaultId,
    key_epoch: vector.common.keyEpoch,
    object_id: entry.objectId,
    event_id: entry.eventId,
    source_device_id: entry.sourceDeviceId,
    schema_id: entry.schema,
    base_revision: entry.baseRevision,
    operation: entry.operation,
    kdf_salt: base64(bytes(entry.saltHex)),
    nonce: base64(bytes(entry.nonceHex)),
    ciphertext_and_tag: base64(bytes(entry.ciphertextAndTagHex)),
    committed_revision: entry.baseRevision + 1,
    conflict: false,
  };
}

class StaticRootSecrets implements VaultRootSecretProvider {
  constructor(private readonly secret: Uint8Array<ArrayBuffer>) {}

  async getVaultRootSecret() {
    return new Uint8Array(this.secret);
  }
}

class RecordingValidator implements SyncPlaintextValidator {
  readonly values: unknown[] = [];

  async validate(schemaId: string, value: unknown) {
    expect(schemaId).toBe('health-record-v1');
    this.values.push(value);
  }
}

class MemoryLocalTarget implements LocalSyncApplyTarget {
  readonly applied: Array<{ event: WireSyncEvent; value: unknown }> = [];

  constructor(private revision: number | null) {}

  async getRevision() {
    return this.revision;
  }

  async applyRemote(event: WireSyncEvent, value: unknown) {
    this.applied.push({ event, value });
    this.revision = event.committed_revision;
  }
}

class MemoryConflictStore implements SyncConflictStore {
  readonly conflicts: PreservedSyncConflict[] = [];

  async preserve(conflict: PreservedSyncConflict) {
    this.conflicts.push(structuredClone(conflict));
  }

  async list() {
    return structuredClone(this.conflicts);
  }

  async clear() {
    this.conflicts.length = 0;
  }
}

async function makeHarness(localRevision: number | null) {
  const vector = await loadVector();
  const validator = new RecordingValidator();
  const local = new MemoryLocalTarget(localRevision);
  const conflicts = new MemoryConflictStore();
  const applier = new ConflictAwareRemoteEventApplier({
    rootSecrets: new StaticRootSecrets(bytes(vector.common.vaultRootSecretHex)),
    validator,
    local,
    conflicts,
  });
  return { vector, validator, local, conflicts, applier, event: wireFromVector(vector) };
}

describe('Conflict-aware remote application', () => {
  it('decrypts and validates before applying an exact revision transition', async () => {
    const { vector, validator, local, conflicts, applier, event } = await makeHarness(7);

    await expect(applier.apply(event)).resolves.toBe('applied');
    expect(validator.values).toEqual([JSON.parse(vector.syncEvent.plaintextUtf8) as unknown]);
    expect(local.applied).toHaveLength(1);
    expect(local.applied[0]?.event.committed_revision).toBe(8);
    expect(conflicts.conflicts).toEqual([]);
  });

  it('preserves a server-marked concurrent branch without overwriting local state', async () => {
    const { local, conflicts, applier, event } = await makeHarness(7);

    await expect(applier.apply({ ...event, conflict: true })).resolves.toBe('conflict-preserved');
    expect(local.applied).toEqual([]);
    expect(conflicts.conflicts).toHaveLength(1);
    expect(conflicts.conflicts[0]?.reason).toBe('server-conflict');
  });

  it('preserves stale edits so tombstones/current state cannot be silently resurrected', async () => {
    const { local, conflicts, applier, event } = await makeHarness(8);

    await expect(applier.apply(event)).resolves.toBe('conflict-preserved');
    expect(local.applied).toEqual([]);
    expect(conflicts.conflicts[0]?.reason).toBe('stale-base');
  });

  it('preserves future/out-of-order revisions instead of dropping them by arrival order', async () => {
    const { local, conflicts, applier, event } = await makeHarness(6);

    await expect(applier.apply(event)).resolves.toBe('conflict-preserved');
    expect(local.applied).toEqual([]);
    expect(conflicts.conflicts[0]?.reason).toBe('missing-predecessor');
  });

  it('never persists decrypted plaintext in the sync conflict store', async () => {
    const { conflicts, applier, event } = await makeHarness(8);

    await applier.apply(event);
    const serialized = JSON.stringify(await conflicts.list());
    expect(serialized).toContain(event.ciphertext_and_tag);
    expect(serialized).not.toContain('synthetic-test');
    expect(serialized).not.toContain('alpha');
  });

  it('has no local side effects when AES-GCM authentication fails', async () => {
    const { local, conflicts, validator, applier, event } = await makeHarness(7);
    const ciphertext = Uint8Array.from(atob(event.ciphertext_and_tag), (part) => part.charCodeAt(0));
    ciphertext[0] ^= 0x01;

    await expect(
      applier.apply({ ...event, ciphertext_and_tag: base64(ciphertext) }),
    ).rejects.toThrow();
    expect(validator.values).toEqual([]);
    expect(local.applied).toEqual([]);
    expect(conflicts.conflicts).toEqual([]);
  });

  it('tracks the authoritative shared conflict cases that require client-side preservation after decrypt', async () => {
    const vectors = await loadConflictVectors();
    const required = new Map(vectors.cases.map((entry) => [entry.id, entry.expected]));

    expect(required.get('same-object-concurrent-updates')?.clientResolution).toBe('required-after-decrypt');
    expect(required.get('stale-base-revision')?.clientResolution).toBe('required-after-decrypt');
    expect(required.get('tombstone-versus-stale-edit')?.clientResolution).toBe('required-after-decrypt');
    expect(required.get('out-of-order-delivery')?.dropBecauseArrivalOrder).toBe(false);
  });
});
