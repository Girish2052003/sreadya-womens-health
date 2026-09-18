import { describe, expect, it } from 'vitest';

import { SyncOrchestrator, type SyncCycleClient } from './orchestrator';
import {
  SyncQueue,
  type QueuedSyncEvent,
  type SyncQueuePersistence,
  type SyncQueueState,
} from './queue';
import type { PreservedSyncConflict, SyncConflictStore } from './reconcile';

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

class MemoryConflictStore implements SyncConflictStore {
  values: PreservedSyncConflict[] = [];

  async preserve(conflict: PreservedSyncConflict) {
    this.values.push(structuredClone(conflict));
  }

  async list() {
    return structuredClone(this.values);
  }

  async clear() {
    this.values = [];
  }
}

class ScriptedSyncClient implements SyncCycleClient {
  readonly calls: string[] = [];

  constructor(private readonly uploads: boolean[]) {}

  async uploadNext() {
    this.calls.push('upload');
    return this.uploads.shift() ?? false;
  }

  async pullAndApply(vaultId: string, limit: number) {
    this.calls.push(`pull:${vaultId}:${limit}`);
    return { applied: 2, conflicts: 1 };
  }
}

describe('SyncOrchestrator', () => {
  it('drains pending uploads before pulling and applying one remote page on reconnect', async () => {
    const queue = new SyncQueue(new MemorySyncQueuePersistence());
    const conflicts = new MemoryConflictStore();
    const client = new ScriptedSyncClient([true, true, false]);
    const orchestrator = new SyncOrchestrator({ queue, conflicts, client });

    await expect(orchestrator.synchronize('vault-a', 50)).resolves.toEqual({
      uploaded: 2,
      applied: 2,
      conflicts: 1,
      paused: false,
    });
    expect(client.calls).toEqual(['upload', 'upload', 'upload', 'pull:vault-a:50']);
  });

  it('performs zero network work while paused and resumes without clearing queued state', async () => {
    const queue = new SyncQueue(new MemorySyncQueuePersistence());
    await queue.enqueue({ eventId: 'evt-1', vaultId: 'vault-a', body: new TextEncoder().encode('{"ciphertext":"x"}') });
    const conflicts = new MemoryConflictStore();
    const client = new ScriptedSyncClient([true, false]);
    const orchestrator = new SyncOrchestrator({ queue, conflicts, client });

    await orchestrator.pause();
    await expect(orchestrator.synchronize('vault-a', 25)).resolves.toEqual({
      uploaded: 0,
      applied: 0,
      conflicts: 0,
      paused: true,
    });
    expect(client.calls).toEqual([]);
    expect(await queue.listPending()).toHaveLength(1);

    await orchestrator.resume();
    await orchestrator.synchronize('vault-a', 25);
    expect(client.calls).toEqual(['upload', 'upload', 'pull:vault-a:25']);
  });

  it('disable clears only sync queue/cursor and preserved ciphertext conflicts', async () => {
    const queue = new SyncQueue(new MemorySyncQueuePersistence());
    await queue.enqueue({ eventId: 'evt-1', vaultId: 'vault-a', body: new TextEncoder().encode('{"ciphertext":"x"}') });
    await queue.setCursor('cursor-9');
    await queue.pause();
    const conflicts = new MemoryConflictStore();
    conflicts.values = [
      {
        event: {
          protocol_version: 1,
          suite_id: 'SREADYA-AES256GCM-HKDFSHA256-ED25519-V1',
          account_id: 'acct-a',
          vault_id: 'vault-a',
          key_epoch: 1,
          object_id: 'obj-a',
          event_id: 'evt-conflict',
          source_device_id: 'dev-a',
          schema_id: 'health-record-v1',
          base_revision: 1,
          operation: 'upsert',
          kdf_salt: 'AA==',
          nonce: 'AA==',
          ciphertext_and_tag: 'AA==',
          committed_revision: 2,
          conflict: true,
        },
        reason: 'server-conflict',
      },
    ];
    const client = new ScriptedSyncClient([]);
    const orchestrator = new SyncOrchestrator({ queue, conflicts, client });

    await orchestrator.disable();

    expect(await queue.listPending()).toEqual([]);
    expect(await queue.getCursor()).toBe('');
    expect(await queue.isPaused()).toBe(false);
    expect(await conflicts.list()).toEqual([]);
    expect(client.calls).toEqual([]);
  });
});
