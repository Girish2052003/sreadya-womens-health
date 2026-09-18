import type { SyncQueue } from './queue';

const CHALLENGE_PATH = '/v1/sync/challenge';
const PUSH_PATH = '/v1/sync/push';
const PULL_PATH = '/v1/sync/pull';

export interface DeviceSigner {
  sign(message: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>>;
}

export type RemoteApplyResult = 'applied' | 'conflict-preserved';

export interface RemoteEventApplier {
  apply(event: unknown): Promise<RemoteApplyResult>;
}

export class SyncTransportError extends Error {
  constructor(readonly status?: number) {
    super('Sync request failed.');
    this.name = 'SyncTransportError';
  }
}

type DeviceAuthTranscriptInput = {
  accountId: string;
  deviceId: string;
  method: string;
  path: string;
  challenge: string;
  bodySha256Hex: string;
};

type SignedSyncClientOptions = {
  baseUrl: string;
  accountId: string;
  deviceId: string;
  queue: SyncQueue;
  signer: DeviceSigner;
  applier: RemoteEventApplier;
  fetchImpl?: typeof fetch;
};

type ChallengeResponse = {
  challenge: string;
};

type PushAcknowledgement = {
  event_id: string;
  committed_revision: number;
  conflict: boolean;
  existing: boolean;
};

type PullPage = {
  events: unknown[];
  next_cursor: string;
};

function utf8(value: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(value);
}

function toHex(value: Uint8Array<ArrayBuffer>): string {
  return Array.from(value)
    .map((part) => part.toString(16).padStart(2, '0'))
    .join('');
}

function lp16(fields: readonly Uint8Array<ArrayBuffer>[]): Uint8Array<ArrayBuffer> {
  let totalLength = 0;
  for (const field of fields) {
    if (field.byteLength > 0xffff) throw new Error('Device-auth transcript field is too large.');
    totalLength += 2 + field.byteLength;
  }

  const output = new Uint8Array(totalLength);
  const view = new DataView(output.buffer);
  let offset = 0;
  for (const field of fields) {
    view.setUint16(offset, field.byteLength, false);
    offset += 2;
    output.set(field, offset);
    offset += field.byteLength;
  }
  return output;
}

export function deviceAuthTranscript(input: DeviceAuthTranscriptInput): Uint8Array<ArrayBuffer> {
  return lp16([
    utf8('sreadya-device-auth-v1'),
    utf8(input.accountId),
    utf8(input.deviceId),
    utf8(input.method.toUpperCase()),
    utf8(input.path),
    utf8(input.challenge),
    utf8(input.bodySha256Hex.toLowerCase()),
  ]);
}

async function sha256Hex(value: Uint8Array<ArrayBuffer>): Promise<string> {
  return toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', value)));
}

function bytesToBase64(value: Uint8Array<ArrayBuffer>): string {
  return btoa(String.fromCharCode(...value));
}

function goQueryEscape(value: string): string {
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, (part) => `%${part.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, '+');
}

function canonicalPullTarget(vaultId: string, cursor: string, limit: number): string {
  return `${PULL_PATH}?cursor=${goQueryEscape(cursor)}&limit=${limit}&vault_id=${goQueryEscape(vaultId)}`;
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

async function parseJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new SyncTransportError(response.status);
  }
}

function assertChallenge(value: ChallengeResponse): string {
  if (!value || typeof value.challenge !== 'string' || value.challenge.length === 0) {
    throw new SyncTransportError();
  }
  return value.challenge;
}

function assertAcknowledgement(value: PushAcknowledgement, eventId: string): PushAcknowledgement {
  if (
    !value ||
    value.event_id !== eventId ||
    !Number.isInteger(value.committed_revision) ||
    typeof value.conflict !== 'boolean' ||
    typeof value.existing !== 'boolean'
  ) {
    throw new SyncTransportError();
  }
  return value;
}

function assertPullPage(value: PullPage): PullPage {
  if (!value || !Array.isArray(value.events) || typeof value.next_cursor !== 'string') {
    throw new SyncTransportError();
  }
  return value;
}

export class SignedSyncClient {
  private readonly baseUrl: string;
  private readonly accountId: string;
  private readonly deviceId: string;
  private readonly queue: SyncQueue;
  private readonly signer: DeviceSigner;
  private readonly applier: RemoteEventApplier;
  private readonly fetchImpl: typeof fetch;

  constructor(options: SignedSyncClientOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.accountId = options.accountId;
    this.deviceId = options.deviceId;
    this.queue = options.queue;
    this.signer = options.signer;
    this.applier = options.applier;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async uploadNext(): Promise<boolean> {
    const event = await this.queue.peekPending();
    if (!event) return false;

    const body = new Uint8Array(event.body);
    const bodySha256Hex = await sha256Hex(body);
    const challenge = await this.issueChallenge({ action: 'sync.push', body_sha256: bodySha256Hex });
    const signature = await this.signer.sign(
      deviceAuthTranscript({
        accountId: this.accountId,
        deviceId: this.deviceId,
        method: 'POST',
        path: PUSH_PATH,
        challenge,
        bodySha256Hex,
      }),
    );

    const response = await this.fetchImpl(this.baseUrl + PUSH_PATH, {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'X-Sreadya-Device-Challenge': challenge,
        'X-Sreadya-Device-Signature': bytesToBase64(signature),
      },
      body,
    });
    if (!response.ok) throw new SyncTransportError(response.status);

    const acknowledgement = assertAcknowledgement(await parseJson<PushAcknowledgement>(response), event.eventId);
    if (acknowledgement.event_id === event.eventId) await this.queue.acknowledge(event.eventId);
    return true;
  }

  async pullAndApply(vaultId: string, limit: number): Promise<{ applied: number; conflicts: number }> {
    if (vaultId.length === 0 || !Number.isInteger(limit) || limit < 1 || limit > 1000) {
      throw new Error('Pull requires an opaque vault ID and limit between 1 and 1000.');
    }

    const cursor = await this.queue.getCursor();
    const target = canonicalPullTarget(vaultId, cursor, limit);
    const challenge = await this.issueChallenge({
      action: 'sync.pull',
      vault_id: vaultId,
      cursor,
      limit,
    });
    const emptyBodyHash = await sha256Hex(new Uint8Array());
    const signature = await this.signer.sign(
      deviceAuthTranscript({
        accountId: this.accountId,
        deviceId: this.deviceId,
        method: 'GET',
        path: target,
        challenge,
        bodySha256Hex: emptyBodyHash,
      }),
    );

    const response = await this.fetchImpl(this.baseUrl + target, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'X-Sreadya-Device-Challenge': challenge,
        'X-Sreadya-Device-Signature': bytesToBase64(signature),
      },
    });
    if (!response.ok) throw new SyncTransportError(response.status);

    const page = assertPullPage(await parseJson<PullPage>(response));
    let applied = 0;
    let conflicts = 0;
    for (const event of page.events) {
      const result = await this.applier.apply(event);
      if (result === 'conflict-preserved') conflicts += 1;
      else if (result === 'applied') applied += 1;
      else throw new Error('Remote event applier returned an unsupported result.');
    }

    await this.queue.setCursor(page.next_cursor);
    return { applied, conflicts };
  }

  private async issueChallenge(body: Record<string, unknown>): Promise<string> {
    const response = await this.fetchImpl(this.baseUrl + CHALLENGE_PATH, {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new SyncTransportError(response.status);
    return assertChallenge(await parseJson<ChallengeResponse>(response));
  }
}
