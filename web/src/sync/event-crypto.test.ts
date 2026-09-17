import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  SYNC_SUITE_V1,
  decryptSyncEvent,
  deriveSyncEventKey,
  type WireSyncEvent,
} from './event-crypto';

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
    derivedKeyHex: string;
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

function base64(value: Uint8Array<ArrayBuffer>): string {
  return btoa(String.fromCharCode(...value));
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), (part) => part.charCodeAt(0));
}

async function loadVector(): Promise<VectorFile> {
  const vectorPath = resolve(process.cwd(), '../shared/crypto/interoperability-vectors/e2ee-v1.json');
  return JSON.parse(await readFile(vectorPath, 'utf8')) as VectorFile;
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

describe('Task-19 sync-event crypto in production Web code', () => {
  it('derives the frozen event key and decrypts the golden vector exactly', async () => {
    const vector = await loadVector();
    const envelope = wireFromVector(vector);
    const rootSecret = bytes(vector.common.vaultRootSecretHex);

    expect(SYNC_SUITE_V1).toBe(vector.suiteId);
    expect(hex(await deriveSyncEventKey(rootSecret, envelope))).toBe(vector.syncEvent.derivedKeyHex);
    await expect(decryptSyncEvent(rootSecret, envelope)).resolves.toEqual(
      JSON.parse(vector.syncEvent.plaintextUtf8) as unknown,
    );
  });

  it('fails closed when ciphertext/tag bytes are modified', async () => {
    const vector = await loadVector();
    const envelope = wireFromVector(vector);
    const tampered = fromBase64(envelope.ciphertext_and_tag);
    tampered[0] ^= 0x01;

    await expect(
      decryptSyncEvent(bytes(vector.common.vaultRootSecretHex), {
        ...envelope,
        ciphertext_and_tag: base64(tampered),
      }),
    ).rejects.toThrow();
  });

  it('fails closed when authenticated metadata is substituted', async () => {
    const vector = await loadVector();
    const envelope = wireFromVector(vector);

    await expect(
      decryptSyncEvent(bytes(vector.common.vaultRootSecretHex), {
        ...envelope,
        base_revision: envelope.base_revision + 1,
      }),
    ).rejects.toThrow();
  });

  it('rejects unknown suites instead of silently downgrading', async () => {
    const vector = await loadVector();
    const envelope = wireFromVector(vector);

    await expect(
      decryptSyncEvent(bytes(vector.common.vaultRootSecretHex), {
        ...envelope,
        suite_id: 'UNKNOWN-OR-DOWNGRADED',
      }),
    ).rejects.toThrow('Unsupported Sreva sync suite.');
  });
});
