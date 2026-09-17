export const SYNC_SUITE_V1 = 'SREVA-AES256GCM-HKDFSHA256-ED25519-V1';

export type WireSyncEvent = {
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
  committed_revision: number;
  conflict: boolean;
};

export type SyncEventCryptoContext = Omit<
  WireSyncEvent,
  'ciphertext_and_tag' | 'committed_revision' | 'conflict'
>;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function utf8(value: string): Uint8Array<ArrayBuffer> {
  return encoder.encode(value);
}

function lp16(fields: readonly Uint8Array<ArrayBuffer>[]): Uint8Array<ArrayBuffer> {
  let length = 0;
  for (const field of fields) {
    if (field.byteLength > 0xffff) throw new Error('Sreva protocol field is too large.');
    length += 2 + field.byteLength;
  }

  const output = new Uint8Array(length);
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

function decodeBase64(value: string): Uint8Array<ArrayBuffer> {
  let binary: string;
  try {
    binary = atob(value);
  } catch {
    throw new Error('Invalid Sreva sync envelope encoding.');
  }
  return Uint8Array.from(binary, (part) => part.charCodeAt(0));
}

function assertCryptoContext(envelope: SyncEventCryptoContext): void {
  if (envelope.protocol_version !== 1 || envelope.suite_id !== SYNC_SUITE_V1) {
    throw new Error('Unsupported Sreva sync suite.');
  }
  if (
    envelope.account_id.length === 0 ||
    envelope.vault_id.length === 0 ||
    envelope.object_id.length === 0 ||
    envelope.event_id.length === 0 ||
    envelope.source_device_id.length === 0 ||
    envelope.schema_id.length === 0 ||
    !Number.isSafeInteger(envelope.key_epoch) ||
    envelope.key_epoch < 0 ||
    !Number.isSafeInteger(envelope.base_revision) ||
    envelope.base_revision < 0 ||
    (envelope.operation !== 'upsert' && envelope.operation !== 'tombstone')
  ) {
    throw new Error('Invalid Sreva sync envelope metadata.');
  }
}

function assertEnvelope(envelope: WireSyncEvent): void {
  assertCryptoContext(envelope);
  if (!Number.isSafeInteger(envelope.committed_revision) || envelope.committed_revision < 1) {
    throw new Error('Invalid Sreva sync envelope metadata.');
  }
}

function eventKeyInfo(envelope: SyncEventCryptoContext): Uint8Array<ArrayBuffer> {
  return lp16([
    utf8('sreva-event-key-v1'),
    utf8(envelope.event_id),
    utf8(envelope.object_id),
    utf8(envelope.source_device_id),
    utf8(String(envelope.key_epoch)),
    utf8(envelope.suite_id),
  ]);
}

export function syncEventAad(envelope: SyncEventCryptoContext): Uint8Array<ArrayBuffer> {
  assertCryptoContext(envelope);
  return lp16([
    utf8('sreva-sync-event-v1'),
    utf8(envelope.account_id),
    utf8(envelope.vault_id),
    utf8(envelope.event_id),
    utf8(envelope.object_id),
    utf8(envelope.source_device_id),
    utf8(String(envelope.key_epoch)),
    utf8(envelope.schema_id),
    utf8(String(envelope.base_revision)),
    utf8(envelope.operation),
    utf8(envelope.suite_id),
  ]);
}

export async function deriveSyncEventKey(
  vaultRootSecret: Uint8Array<ArrayBuffer>,
  envelope: SyncEventCryptoContext,
): Promise<Uint8Array<ArrayBuffer>> {
  assertCryptoContext(envelope);
  if (vaultRootSecret.byteLength !== 32) throw new Error('Sreva vault root secret must be 32 bytes.');

  const salt = decodeBase64(envelope.kdf_salt);
  if (salt.byteLength !== 32) throw new Error('Sreva sync event salt must be 32 bytes.');

  const rootKey = await crypto.subtle.importKey('raw', vaultRootSecret, 'HKDF', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: eventKeyInfo(envelope),
    },
    rootKey,
    256,
  );
  return new Uint8Array(derived);
}

export async function decryptSyncEvent<T = unknown>(
  vaultRootSecret: Uint8Array<ArrayBuffer>,
  envelope: WireSyncEvent,
): Promise<T> {
  assertEnvelope(envelope);
  const nonce = decodeBase64(envelope.nonce);
  const ciphertextAndTag = decodeBase64(envelope.ciphertext_and_tag);
  if (nonce.byteLength !== 12) throw new Error('Sreva sync event nonce must be 12 bytes.');
  if (ciphertextAndTag.byteLength < 16) throw new Error('Sreva sync event ciphertext is invalid.');

  const keyBytes = await deriveSyncEventKey(vaultRootSecret, envelope);
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
  const clear = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: nonce,
      additionalData: syncEventAad(envelope),
      tagLength: 128,
    },
    key,
    ciphertextAndTag,
  );

  try {
    return JSON.parse(decoder.decode(clear)) as T;
  } catch {
    throw new Error('Decrypted Sreva sync event is not valid JSON.');
  }
}
