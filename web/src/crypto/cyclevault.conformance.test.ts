import { describe, expect, it } from 'vitest';

import vector from '../../../shared/crypto/interoperability-vectors/cyclevault-v1.json';
import {
  deriveCycleVaultKey,
  openCycleVaultV1,
  sealCycleVaultV1,
  type CycleVaultManifestV1,
  type CycleVaultPayloadV1,
} from './cyclevault';

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(Buffer.from(value, 'base64'));
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
}

describe('CycleVault v1 Web/mobile interoperability', () => {
  it('reproduces the independent Argon2id known answer', () => {
    const key = deriveCycleVaultKey(vector.passphrase, fromBase64(vector.saltBase64));
    expect(toHex(key)).toBe(vector.derivedKeyHex);
  });

  it('decrypts the exact container already accepted by production Dart', async () => {
    const payload = await openCycleVaultV1(vector.containerJson, vector.passphrase);

    expect(payload).toEqual(vector.payload);
  });

  it('deterministically seals the same manifest and payload to the same bytes', async () => {
    const manifest = JSON.parse(vector.manifestJson) as CycleVaultManifestV1;
    const payload = JSON.parse(vector.payloadJson) as CycleVaultPayloadV1;
    const container = await sealCycleVaultV1({
      manifest,
      payload,
      passphrase: vector.passphrase,
      salt: fromBase64(vector.saltBase64),
      nonce: fromBase64(vector.nonceBase64),
    });

    expect(container).toBe(vector.containerJson);
  });

  it('rejects wrong passphrase, tamper and unsupported format version', async () => {
    await expect(openCycleVaultV1(vector.containerJson, 'definitely the wrong passphrase')).rejects.toThrow();

    const tampered = JSON.parse(vector.containerJson) as {
      manifest: Record<string, unknown>;
      salt: string;
      sealedPayload: string;
    };
    const sealed = fromBase64(tampered.sealedPayload);
    sealed[Math.floor(sealed.length / 2)] ^= 0x01;
    tampered.sealedPayload = Buffer.from(sealed).toString('base64');
    await expect(openCycleVaultV1(JSON.stringify(tampered), vector.passphrase)).rejects.toThrow();

    const unsupported = JSON.parse(vector.containerJson) as {
      manifest: Record<string, unknown>;
      salt: string;
      sealedPayload: string;
    };
    unsupported.manifest.formatVersion = 999;
    await expect(openCycleVaultV1(JSON.stringify(unsupported), vector.passphrase)).rejects.toThrow(/format/i);
  });
});
