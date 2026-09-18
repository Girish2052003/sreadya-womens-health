import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  SignedSyncClient,
  SyncTransportError,
  deviceAuthTranscript,
  type DeviceSigner,
  type RemoteEventApplier,
} from './client';
import {
  SyncQueue,
  type QueuedSyncEvent,
  type SyncQueuePersistence,
  type SyncQueueState,
} from './queue';

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

class CapturingSigner implements DeviceSigner {
  readonly messages: Uint8Array<ArrayBuffer>[] = [];

  constructor(private readonly signature = new Uint8Array(64).fill(0x5a)) {}

  async sign(message: Uint8Array<ArrayBuffer>) {
    this.messages.push(new Uint8Array(message));
    return new Uint8Array(this.signature);
  }
}

class FakeApplier implements RemoteEventApplier {
  readonly events: unknown[] = [];

  constructor(private readonly result: 'applied' | 'conflict-preserved' = 'applied', private readonly error?: Error) {}

  async apply(event: unknown) {
    this.events.push(event);
    if (this.error) throw this.error;
    return this.result;
  }
}

type FetchCall = { url: string; init: RequestInit | undefined };

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function textBytes(value: string) {
  return new TextEncoder().encode(value);
}

function hex(value: Uint8Array<ArrayBuffer>) {
  return Array.from(value)
    .map((part) => part.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256Hex(value: Uint8Array<ArrayBuffer>) {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', value)));
}

function requestBodyBytes(body: BodyInit | null | undefined): Uint8Array<ArrayBuffer> {
  if (typeof body === 'string') return textBytes(body);
  if (body instanceof Uint8Array) return new Uint8Array(body);
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  throw new Error(`Unsupported test request body: ${String(body)}`);
}

function makeClient(input: {
  queue: SyncQueue;
  signer: DeviceSigner;
  fetchImpl: typeof fetch;
  applier?: RemoteEventApplier;
}) {
  return new SignedSyncClient({
    baseUrl: 'https://sync.example.test',
    accountId: 'acct-a',
    deviceId: 'dev-a',
    queue: input.queue,
    signer: input.signer,
    fetchImpl: input.fetchImpl,
    applier: input.applier ?? new FakeApplier(),
  });
}

describe('Task-19 device-auth transcript', () => {
  it('reproduces the frozen LP16 interoperability transcript exactly', async () => {
    const vectorPath = resolve(process.cwd(), '../shared/crypto/interoperability-vectors/e2ee-v1.json');
    const vector = JSON.parse(await readFile(vectorPath, 'utf8')) as {
      deviceAuthentication: {
        accountId: string;
        deviceId: string;
        method: string;
        path: string;
        challenge: string;
        bodySha256Hex: string;
        transcriptHex: string;
      };
    };
    const entry = vector.deviceAuthentication;

    const transcript = deviceAuthTranscript({
      accountId: entry.accountId,
      deviceId: entry.deviceId,
      method: entry.method,
      path: entry.path,
      challenge: entry.challenge,
      bodySha256Hex: entry.bodySha256Hex,
    });

    expect(hex(transcript)).toBe(entry.transcriptHex);
  });
});

describe('SignedSyncClient push', () => {
  it('hashes and uploads the exact immutable queued bytes, then removes only the matching acknowledgement', async () => {
    const queue = new SyncQueue(new MemorySyncQueuePersistence());
    const body = textBytes('{"account_id":"acct-a", "vault_id":"vault-a","event_id":"evt-1","source_device_id":"dev-a","ciphertext_and_tag":"b3BhcXVl"}');
    await queue.enqueue({ eventId: 'evt-1', vaultId: 'vault-a', body });
    const signer = new CapturingSigner();
    const calls: FetchCall[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push({ url, init });
      if (calls.length === 1) {
        const challengeBody = JSON.parse(new TextDecoder().decode(requestBodyBytes(init?.body))) as {
          action: string;
          body_sha256: string;
        };
        expect(url).toBe('https://sync.example.test/v1/sync/challenge');
        expect(challengeBody).toEqual({ action: 'sync.push', body_sha256: await sha256Hex(body) });
        return jsonResponse({ challenge: 'challenge-push' });
      }
      if (calls.length === 2) {
        expect(url).toBe('https://sync.example.test/v1/sync/push');
        expect(requestBodyBytes(init?.body)).toEqual(body);
        const headers = new Headers(init?.headers);
        expect(headers.get('X-Sreadya-Device-Challenge')).toBe('challenge-push');
        expect(headers.get('X-Sreadya-Device-Signature')).toBe(btoa(String.fromCharCode(...new Uint8Array(64).fill(0x5a))));
        return jsonResponse({ event_id: 'evt-1', committed_revision: 1, conflict: false, existing: false });
      }
      throw new Error('unexpected fetch call');
    };

    await expect(makeClient({ queue, signer, fetchImpl }).uploadNext()).resolves.toBe(true);
    await expect(queue.listPending()).resolves.toEqual([]);
    expect(calls).toHaveLength(2);
    expect(signer.messages).toHaveLength(1);
  });

  it('retains immutable queued bytes when upload fails and does not persist server error text', async () => {
    const queue = new SyncQueue(new MemorySyncQueuePersistence());
    const body = textBytes('{"event_id":"evt-1","ciphertext_and_tag":"opaque"}');
    await queue.enqueue({ eventId: 'evt-1', vaultId: 'vault-a', body });
    let call = 0;
    const fetchImpl: typeof fetch = async () => {
      call += 1;
      return call === 1
        ? jsonResponse({ challenge: 'challenge-push' })
        : new Response('SECRET SERVER DETAIL', { status: 503 });
    };

    const error = await makeClient({ queue, signer: new CapturingSigner(), fetchImpl }).uploadNext().catch((value: unknown) => value);
    expect(error).toBeInstanceOf(SyncTransportError);
    expect(String(error)).not.toContain('SECRET SERVER DETAIL');
    expect((await queue.peekPending())?.body).toEqual(body);
  });
});

describe('SignedSyncClient pull', () => {
  it('signs the canonical opaque pull target and advances cursor only after safe local apply', async () => {
    const queue = new SyncQueue(new MemorySyncQueuePersistence());
    await queue.setCursor('v1.AAAAAAAAACo');
    const signer = new CapturingSigner();
    const applier = new FakeApplier();
    const calls: FetchCall[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push({ url, init });
      if (calls.length === 1) {
        const body = JSON.parse(new TextDecoder().decode(requestBodyBytes(init?.body))) as Record<string, unknown>;
        expect(body).toEqual({ action: 'sync.pull', vault_id: 'vault-a', cursor: 'v1.AAAAAAAAACo', limit: 25 });
        return jsonResponse({ challenge: 'challenge-pull' });
      }
      if (calls.length === 2) {
        expect(url).toBe('https://sync.example.test/v1/sync/pull?cursor=v1.AAAAAAAAACo&limit=25&vault_id=vault-a');
        return jsonResponse({
          events: [{ event_id: 'remote-1', committed_revision: 8, conflict: false, ciphertext_and_tag: 'b3BhcXVl' }],
          next_cursor: 'v1.AAAAAAAAACs',
        });
      }
      throw new Error('unexpected fetch call');
    };

    await expect(makeClient({ queue, signer, fetchImpl, applier }).pullAndApply('vault-a', 25)).resolves.toEqual({
      applied: 1,
      conflicts: 0,
    });
    expect(applier.events).toHaveLength(1);
    await expect(queue.getCursor()).resolves.toBe('v1.AAAAAAAAACs');
    expect(signer.messages).toHaveLength(1);
  });

  it('retains the previous cursor when decrypt/validation/application fails', async () => {
    const queue = new SyncQueue(new MemorySyncQueuePersistence());
    await queue.setCursor('cursor-before');
    let call = 0;
    const fetchImpl: typeof fetch = async () => {
      call += 1;
      return call === 1
        ? jsonResponse({ challenge: 'challenge-pull' })
        : jsonResponse({ events: [{ event_id: 'bad-remote' }], next_cursor: 'cursor-after' });
    };
    const applier = new FakeApplier('applied', new Error('local decrypt failed'));

    await expect(makeClient({ queue, signer: new CapturingSigner(), fetchImpl, applier }).pullAndApply('vault-a', 25)).rejects.toThrow(
      'local decrypt failed',
    );
    await expect(queue.getCursor()).resolves.toBe('cursor-before');
  });
});
