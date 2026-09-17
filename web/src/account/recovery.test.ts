import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { deriveRecoveryWrapKey, unwrapRecoveryEnvelope, type RecoveryEnvelope } from './recovery';

// Task-23 RED sentinel: production recovery crypto is intentionally absent at this commit.
type VectorFile = {
  suiteId: string;
  common: { accountId: string; vaultId: string; keyEpoch: number; vaultRootSecretHex: string };
  recoveryEnvelope: {
    ikmHex: string;
    saltHex: string;
    nonceHex: string;
    derivedKeyHex: string;
    ciphertextAndTagHex: string;
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
  return Array.from(value).map((part) => part.toString(16).padStart(2, '0')).join('');
}

function base64(value: Uint8Array<ArrayBuffer>): string {
  return btoa(String.fromCharCode(...value));
}

async function loadVector(): Promise<VectorFile> {
  const path = resolve(process.cwd(), '../shared/crypto/interoperability-vectors/e2ee-v1.json');
  return JSON.parse(await readFile(path, 'utf8')) as VectorFile;
}

function envelope(vector: VectorFile): RecoveryEnvelope {
  return {
    protocol_version: 1,
    suite_id: vector.suiteId,
    account_id: vector.common.accountId,
    vault_id: vector.common.vaultId,
    key_epoch: vector.common.keyEpoch,
    kdf_salt: base64(bytes(vector.recoveryEnvelope.saltHex)),
    nonce: base64(bytes(vector.recoveryEnvelope.nonceHex)),
    ciphertext_and_tag: base64(bytes(vector.recoveryEnvelope.ciphertextAndTagHex)),
  };
}

describe('Task 23 recovery-key production crypto', () => {
  it('derives and unwraps the frozen Task-19 recovery envelope exactly', async () => {
    const vector = await loadVector();
    const wrapped = envelope(vector);
    const recoverySecret = bytes(vector.recoveryEnvelope.ikmHex);

    expect(hex(await deriveRecoveryWrapKey(recoverySecret, wrapped))).toBe(vector.recoveryEnvelope.derivedKeyHex);
    expect(hex(await unwrapRecoveryEnvelope(recoverySecret, wrapped))).toBe(vector.common.vaultRootSecretHex);
  });

  it('does not let account-only recovery stand in for the independent recovery secret', async () => {
    const vector = await loadVector();
    const accountCredentialBytes = new Uint8Array(32).fill(0x7a);

    await expect(unwrapRecoveryEnvelope(accountCredentialBytes, envelope(vector))).rejects.toThrow();
  });

  it('fails closed when recovery ciphertext is tampered', async () => {
    const vector = await loadVector();
    const wrapped = envelope(vector);
    const ciphertext = bytes(vector.recoveryEnvelope.ciphertextAndTagHex);
    ciphertext[0] ^= 0x01;

    await expect(
      unwrapRecoveryEnvelope(bytes(vector.recoveryEnvelope.ikmHex), {
        ...wrapped,
        ciphertext_and_tag: base64(ciphertext),
      }),
    ).rejects.toThrow();
  });
});
