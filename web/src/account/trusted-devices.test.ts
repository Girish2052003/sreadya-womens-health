import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  deriveTransferWrapKey,
  parseTrustedDeviceQr,
  unwrapTrustedDeviceTransfer,
  type TrustedDeviceTransferEnvelope,
} from './trusted-devices';

type VectorFile = {
  suiteId: string;
  common: { accountId: string; vaultId: string; keyEpoch: number; vaultRootSecretHex: string };
  trustedDeviceTransfer: {
    enrollmentId: string;
    sourceDeviceId: string;
    targetDeviceId: string;
    qrPayload: string;
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

function envelope(vector: VectorFile): TrustedDeviceTransferEnvelope {
  const transfer = vector.trustedDeviceTransfer;
  return {
    protocol_version: 1,
    suite_id: vector.suiteId,
    account_id: vector.common.accountId,
    vault_id: vector.common.vaultId,
    key_epoch: vector.common.keyEpoch,
    enrollment_id: transfer.enrollmentId,
    source_device_id: transfer.sourceDeviceId,
    target_device_id: transfer.targetDeviceId,
    kdf_salt: base64(bytes(transfer.saltHex)),
    nonce: base64(bytes(transfer.nonceHex)),
    ciphertext_and_tag: base64(bytes(transfer.ciphertextAndTagHex)),
  };
}

describe('Task 23 trusted-device production crypto', () => {
  it('parses only the frozen direct-transfer QR shape', async () => {
    const vector = await loadVector();
    const parsed = parseTrustedDeviceQr(vector.trustedDeviceTransfer.qrPayload);

    expect(parsed.enrollmentId).toBe(vector.trustedDeviceTransfer.enrollmentId);
    expect(hex(parsed.transferSecret)).toBe(vector.trustedDeviceTransfer.ikmHex);
    expect(() => parseTrustedDeviceQr(`SREVA-TRANSFER-2:${parsed.enrollmentId}:AAAA`)).toThrow();
  });

  it('derives and unwraps the frozen Web-to-mobile transfer vector exactly', async () => {
    const vector = await loadVector();
    const wrapped = envelope(vector);
    const transferSecret = bytes(vector.trustedDeviceTransfer.ikmHex);

    expect(hex(await deriveTransferWrapKey(transferSecret, wrapped))).toBe(vector.trustedDeviceTransfer.derivedKeyHex);
    expect(hex(await unwrapTrustedDeviceTransfer(transferSecret, wrapped))).toBe(vector.common.vaultRootSecretHex);
  });

  it('authenticates source and target identities instead of accepting substituted metadata', async () => {
    const vector = await loadVector();
    const wrapped = envelope(vector);

    await expect(
      unwrapTrustedDeviceTransfer(bytes(vector.trustedDeviceTransfer.ikmHex), {
        ...wrapped,
        target_device_id: 'dev_attacker',
      }),
    ).rejects.toThrow();
  });
});
