import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { decryptSyncEvent, type WireSyncEvent } from './event-crypto';
import {
  EncryptedSyncOutbox,
  type OutgoingSyncRandomSource,
  type OutgoingVaultRootSecretProvider,
} from './outgoing';
import {
  SyncQueue,
  type QueuedSyncEvent,
  type SyncQueuePersistence,
  type SyncQueueState,
} from './queue';

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

function bytes(hexValue: string): Uint8Array<ArrayBuffer> {
  const output = new Uint8Array(hexValue.length / 2);
  for (let index = 0; index < output.length; index += 1) {
    output[index] = Number.parseInt(hexValue.slice(index * 2, index * 2 + 2), 16);
  }
  return output;
}

function hex(value: Uint8Array<ArrayBuffer>): string {
  return Array.from(value)
    .map((part) => part.toString(16).padStart(2, '0'))
    .join('');
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), (part) => part.charCodeAt(0));
}

class MemorySyncQueuePersistence implements SyncQueuePersistence {
  private readonly events = new Map<string, QueuedSyncEvent>();
  private state: SyncQueueState = { cursor: '', paused: false };

  async getEvent(eventId: string) {
    const event = this.events.get(eventId);
    return event ? { ...event, body: new Uint8Array(event.body) } : null;
  }

  async putEvent(event: QueuedSyncEvent) {
    this.events.set(event.eventId, { ...event, body: new Uint8Array(event.body) });
  }

  async deleteEvent(eventId: string) {
    this.events.delete(eventId);
  }

  async listEvents() {
    return [...this.events.values()]
      .sort((left, right) => left.sequence - right.sequence)
      .map((event) => ({ ...event, body: new Uint8Array(event.body) }));
  }

  async getState() {
    return { ...this.state };
  }

  async putState(state: SyncQueueState) {
    this.state = { ...state };
  }

  async clearSyncState() {
    this.events.clear();
    this.state = { cursor: '', paused: false };
  }
}

class StaticRootSecretProvider implements OutgoingVaultRootSecretProvider {
  constructor(private readonly value: Uint8Array<ArrayBuffer>) {}

  async getVaultRootSecret() {
    return new Uint8Array(this.value);
  }
}

class FixedRandomSource implements OutgoingSyncRandomSource {
  constructor(
    private readonly eventIdValue: string,
    private readonly saltValue: Uint8Array<ArrayBuffer>,
    private readonly nonceValue: Uint8Array<ArrayBuffer>,
    private readonly nowValue: Date,
  ) {}

  eventId() {
    return this.eventIdValue;
  }

  salt() {
    return new Uint8Array(this.saltValue);
  }

  nonce() {
    return new Uint8Array(this.nonceValue);
  }

  now() {
    return new Date(this.nowValue);
  }
}

async function loadVector(): Promise<VectorFile> {
  const path = resolve(process.cwd(), '../shared/crypto/interoperability-vectors/e2ee-v1.json');
  return JSON.parse(await readFile(path, 'utf8')) as VectorFile;
}

describe('EncryptedSyncOutbox', () => {
  it('turns a committed local change into the frozen Task-19 ciphertext and queues exact immutable bytes', async () => {
    const vector = await loadVector();
    const queue = new SyncQueue(new MemorySyncQueuePersistence());
    const createdAt = new Date('2026-09-17T03:15:00.000Z');
    const outbox = new EncryptedSyncOutbox({
      queue,
      rootSecrets: new StaticRootSecretProvider(bytes(vector.common.vaultRootSecretHex)),
      random: new FixedRandomSource(
        vector.syncEvent.eventId,
        bytes(vector.syncEvent.saltHex),
        bytes(vector.syncEvent.nonceHex),
        createdAt,
      ),
    });
    const plaintext = JSON.parse(vector.syncEvent.plaintextUtf8) as unknown;

    const result = await outbox.recordCommittedChange(
      {
        accountId: vector.common.accountId,
        vaultId: vector.common.vaultId,
        keyEpoch: vector.common.keyEpoch,
        objectId: vector.syncEvent.objectId,
        sourceDeviceId: vector.syncEvent.sourceDeviceId,
        schemaId: vector.syncEvent.schema,
        baseRevision: vector.syncEvent.baseRevision,
        operation: vector.syncEvent.operation,
      },
      plaintext,
    );

    expect(result).toEqual({ eventId: vector.syncEvent.eventId, status: 'queued' });
    const queued = await queue.peekPending();
    expect(queued?.eventId).toBe(vector.syncEvent.eventId);
    expect(queued?.vaultId).toBe(vector.common.vaultId);
    const bodyText = new TextDecoder().decode(queued?.body);
    expect(bodyText).not.toContain('synthetic-test');
    expect(bodyText).not.toContain('alpha');

    const wire = JSON.parse(bodyText) as Record<string, unknown>;
    expect(wire.protocol_version).toBe(1);
    expect(wire.suite_id).toBe(vector.suiteId);
    expect(wire.event_id).toBe(vector.syncEvent.eventId);
    expect(wire.created_at).toBe(createdAt.toISOString());
    expect(wire).not.toHaveProperty('envelope_digest');
    expect(hex(fromBase64(String(wire.kdf_salt)))).toBe(vector.syncEvent.saltHex);
    expect(hex(fromBase64(String(wire.nonce)))).toBe(vector.syncEvent.nonceHex);
    expect(hex(fromBase64(String(wire.ciphertext_and_tag)))).toBe(vector.syncEvent.ciphertextAndTagHex);

    await expect(
      decryptSyncEvent(bytes(vector.common.vaultRootSecretHex), {
        ...(wire as unknown as Omit<WireSyncEvent, 'committed_revision' | 'conflict'>),
        committed_revision: vector.syncEvent.baseRevision + 1,
        conflict: false,
      }),
    ).resolves.toEqual(plaintext);
  });

  it('never rewrites an already queued event ID with different encrypted bytes', async () => {
    const vector = await loadVector();
    const queue = new SyncQueue(new MemorySyncQueuePersistence());
    const random = new FixedRandomSource(
      vector.syncEvent.eventId,
      bytes(vector.syncEvent.saltHex),
      bytes(vector.syncEvent.nonceHex),
      new Date('2026-09-17T03:15:00.000Z'),
    );
    const outbox = new EncryptedSyncOutbox({
      queue,
      rootSecrets: new StaticRootSecretProvider(bytes(vector.common.vaultRootSecretHex)),
      random,
    });
    const metadata = {
      accountId: vector.common.accountId,
      vaultId: vector.common.vaultId,
      keyEpoch: vector.common.keyEpoch,
      objectId: vector.syncEvent.objectId,
      sourceDeviceId: vector.syncEvent.sourceDeviceId,
      schemaId: vector.syncEvent.schema,
      baseRevision: vector.syncEvent.baseRevision,
      operation: vector.syncEvent.operation,
    } as const;

    await outbox.recordCommittedChange(metadata, { value: 'first' });
    await expect(outbox.recordCommittedChange(metadata, { value: 'different' })).rejects.toThrow(
      'Sync event ID is already queued with different bytes.',
    );
    expect(await queue.listPending()).toHaveLength(1);
  });
});
