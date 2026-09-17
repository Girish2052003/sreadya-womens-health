import { describe, expect, it } from 'vitest';

import {
  SyncQueue,
  SyncQueueEventConflictError,
  type QueuedSyncEvent,
  type SyncQueuePersistence,
  type SyncQueueState,
} from './queue';

class MemorySyncQueuePersistence implements SyncQueuePersistence {
  private readonly events = new Map<string, QueuedSyncEvent>();
  private order = 0;
  private state: SyncQueueState = { cursor: '', paused: false };

  async getEvent(eventId: string) {
    return this.events.get(eventId) ?? null;
  }

  async putEvent(event: QueuedSyncEvent) {
    const existing = this.events.get(event.eventId);
    const sequence = existing?.sequence ?? ++this.order;
    this.events.set(event.eventId, {
      ...event,
      sequence,
      body: new Uint8Array(event.body),
    });
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

function bytes(value: string) {
  return new TextEncoder().encode(value);
}

describe('SyncQueue', () => {
  it('stores immutable exact request bytes and returns copies', async () => {
    const persistence = new MemorySyncQueuePersistence();
    const queue = new SyncQueue(persistence);
    const body = bytes('{"event_id":"evt-1","ciphertext":"opaque-A"}');

    await expect(queue.enqueue({ eventId: 'evt-1', vaultId: 'vault-a', body })).resolves.toBe('queued');
    body[0] = 0;

    const pending = await queue.peekPending();
    expect(new TextDecoder().decode(pending?.body)).toBe('{"event_id":"evt-1","ciphertext":"opaque-A"}');
    if (!pending) throw new Error('missing queued event');
    pending.body[1] = 0;

    const reread = await queue.peekPending();
    expect(new TextDecoder().decode(reread?.body)).toBe('{"event_id":"evt-1","ciphertext":"opaque-A"}');
  });

  it('treats byte-identical duplicate event IDs as idempotent and rejects mutated reuse', async () => {
    const queue = new SyncQueue(new MemorySyncQueuePersistence());
    const first = bytes('{"event_id":"evt-1","ciphertext":"opaque-A"}');

    await expect(queue.enqueue({ eventId: 'evt-1', vaultId: 'vault-a', body: first })).resolves.toBe('queued');
    await expect(
      queue.enqueue({ eventId: 'evt-1', vaultId: 'vault-a', body: new Uint8Array(first) }),
    ).resolves.toBe('existing');
    await expect(
      queue.enqueue({ eventId: 'evt-1', vaultId: 'vault-a', body: bytes('{"event_id":"evt-1","ciphertext":"opaque-B"}') }),
    ).rejects.toBeInstanceOf(SyncQueueEventConflictError);
  });

  it('preserves FIFO order and removes only the acknowledged event', async () => {
    const queue = new SyncQueue(new MemorySyncQueuePersistence());
    await queue.enqueue({ eventId: 'evt-1', vaultId: 'vault-a', body: bytes('one') });
    await queue.enqueue({ eventId: 'evt-2', vaultId: 'vault-a', body: bytes('two') });

    expect((await queue.listPending()).map((event) => event.eventId)).toEqual(['evt-1', 'evt-2']);
    await queue.acknowledge('evt-1');
    expect((await queue.listPending()).map((event) => event.eventId)).toEqual(['evt-2']);
  });

  it('persists opaque cursor and pause state without deleting queued ciphertext', async () => {
    const persistence = new MemorySyncQueuePersistence();
    const queue = new SyncQueue(persistence);
    await queue.enqueue({ eventId: 'evt-1', vaultId: 'vault-a', body: bytes('opaque') });

    await queue.setCursor('opaque-cursor-9');
    await queue.pause();

    const reopened = new SyncQueue(persistence);
    await expect(reopened.getCursor()).resolves.toBe('opaque-cursor-9');
    await expect(reopened.isPaused()).resolves.toBe(true);
    expect((await reopened.listPending()).map((event) => event.eventId)).toEqual(['evt-1']);

    await reopened.resume();
    await expect(reopened.isPaused()).resolves.toBe(false);
  });

  it('disable clears only sync queue/cursor state through the sync persistence boundary', async () => {
    const persistence = new MemorySyncQueuePersistence();
    const queue = new SyncQueue(persistence);
    await queue.enqueue({ eventId: 'evt-1', vaultId: 'vault-a', body: bytes('opaque') });
    await queue.setCursor('opaque-cursor-9');
    await queue.pause();

    await queue.disable();

    await expect(queue.listPending()).resolves.toEqual([]);
    await expect(queue.getCursor()).resolves.toBe('');
    await expect(queue.isPaused()).resolves.toBe(false);
  });
});
