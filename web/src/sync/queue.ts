import Dexie, { type Table } from 'dexie';

export type QueuedSyncEvent = {
  sequence: number;
  eventId: string;
  vaultId: string;
  body: Uint8Array<ArrayBuffer>;
};

export type SyncQueueState = {
  cursor: string;
  paused: boolean;
};

export interface SyncQueuePersistence {
  getEvent(eventId: string): Promise<QueuedSyncEvent | null>;
  putEvent(event: QueuedSyncEvent): Promise<void>;
  deleteEvent(eventId: string): Promise<void>;
  listEvents(): Promise<QueuedSyncEvent[]>;
  getState(): Promise<SyncQueueState>;
  putState(state: SyncQueueState): Promise<void>;
  clearSyncState(): Promise<void>;
}

export class SyncQueueEventConflictError extends Error {
  constructor() {
    super('Sync event ID was reused with different immutable bytes.');
    this.name = 'SyncQueueEventConflictError';
  }
}

type StoredQueuedSyncEvent = {
  sequence: number;
  eventId: string;
  vaultId: string;
  body: Uint8Array<ArrayBuffer>;
};

type StoredSyncQueueState = SyncQueueState & {
  key: 'state';
};

function copyBytes(value: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
  return new Uint8Array(value);
}

function copyEvent(event: QueuedSyncEvent): QueuedSyncEvent {
  return {
    sequence: event.sequence,
    eventId: event.eventId,
    vaultId: event.vaultId,
    body: copyBytes(event.body),
  };
}

function equalBytes(left: Uint8Array<ArrayBuffer>, right: Uint8Array<ArrayBuffer>): boolean {
  if (left.byteLength !== right.byteLength) return false;
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

class SreadyaSyncDatabase extends Dexie {
  outbox!: Table<StoredQueuedSyncEvent, number>;
  state!: Table<StoredSyncQueueState, string>;

  constructor(name = 'sreadya-sync-v1') {
    super(name);
    this.version(1).stores({
      outbox: '&sequence,&eventId,vaultId',
      state: '&key',
    });
  }
}

export class DexieSyncQueuePersistence implements SyncQueuePersistence {
  constructor(readonly db = new SreadyaSyncDatabase()) {}

  async getEvent(eventId: string): Promise<QueuedSyncEvent | null> {
    const event = await this.db.outbox.where('eventId').equals(eventId).first();
    return event ? copyEvent(event) : null;
  }

  async putEvent(event: QueuedSyncEvent): Promise<void> {
    await this.db.outbox.add(copyEvent(event));
  }

  async deleteEvent(eventId: string): Promise<void> {
    await this.db.outbox.where('eventId').equals(eventId).delete();
  }

  async listEvents(): Promise<QueuedSyncEvent[]> {
    const events = await this.db.outbox.orderBy('sequence').toArray();
    return events.map(copyEvent);
  }

  async getState(): Promise<SyncQueueState> {
    const state = await this.db.state.get('state');
    return state ? { cursor: state.cursor, paused: state.paused } : { cursor: '', paused: false };
  }

  async putState(state: SyncQueueState): Promise<void> {
    await this.db.state.put({ key: 'state', cursor: state.cursor, paused: state.paused });
  }

  async clearSyncState(): Promise<void> {
    await this.db.transaction('rw', this.db.outbox, this.db.state, async () => {
      await this.db.outbox.clear();
      await this.db.state.clear();
    });
  }
}

export class SyncQueue {
  constructor(private readonly persistence: SyncQueuePersistence) {}

  async enqueue(input: {
    eventId: string;
    vaultId: string;
    body: Uint8Array<ArrayBuffer>;
  }): Promise<'queued' | 'existing'> {
    if (input.eventId.length === 0 || input.vaultId.length === 0 || input.body.byteLength === 0) {
      throw new Error('Sync queue requires opaque event/vault IDs and immutable request bytes.');
    }

    const body = copyBytes(input.body);
    const existing = await this.persistence.getEvent(input.eventId);
    if (existing) {
      if (existing.vaultId === input.vaultId && equalBytes(existing.body, body)) return 'existing';
      throw new SyncQueueEventConflictError();
    }

    const events = await this.persistence.listEvents();
    const nextSequence = events.reduce((maximum, event) => Math.max(maximum, event.sequence), 0) + 1;
    await this.persistence.putEvent({
      sequence: nextSequence,
      eventId: input.eventId,
      vaultId: input.vaultId,
      body,
    });
    return 'queued';
  }

  async peekPending(): Promise<QueuedSyncEvent | null> {
    const [first] = await this.listPending();
    return first ?? null;
  }

  async listPending(): Promise<QueuedSyncEvent[]> {
    const events = await this.persistence.listEvents();
    return events
      .slice()
      .sort((left, right) => left.sequence - right.sequence)
      .map(copyEvent);
  }

  async acknowledge(eventId: string): Promise<void> {
    await this.persistence.deleteEvent(eventId);
  }

  async getCursor(): Promise<string> {
    return (await this.persistence.getState()).cursor;
  }

  async setCursor(cursor: string): Promise<void> {
    const state = await this.persistence.getState();
    await this.persistence.putState({ ...state, cursor });
  }

  async isPaused(): Promise<boolean> {
    return (await this.persistence.getState()).paused;
  }

  async pause(): Promise<void> {
    const state = await this.persistence.getState();
    await this.persistence.putState({ ...state, paused: true });
  }

  async resume(): Promise<void> {
    const state = await this.persistence.getState();
    await this.persistence.putState({ ...state, paused: false });
  }

  async disable(): Promise<void> {
    await this.persistence.clearSyncState();
  }
}
