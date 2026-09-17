import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type EnvelopeVector = {
  ikmHex: string;
  saltHex: string;
  infoHex: string;
  derivedKeyHex: string;
  nonceHex: string;
  aadHex: string;
  ciphertextAndTagHex: string;
  plaintextHex: string;
};

type VectorFile = {
  recoveryEnvelope: EnvelopeVector;
  trustedDeviceTransfer: EnvelopeVector;
  syncEvent: EnvelopeVector;
  deviceAuthentication: {
    publicKeyHex: string;
    transcriptHex: string;
    signatureHex: string;
  };
};

const vectorPath = resolve(process.cwd(), '../shared/crypto/interoperability-vectors/e2ee-v1.json');

function bytes(hexValue: string): Uint8Array<ArrayBuffer> {
  if (hexValue.length % 2 !== 0) throw new Error('Invalid hex length');
  const output = new Uint8Array(hexValue.length / 2);
  for (let i = 0; i < output.length; i += 1) {
    output[i] = Number.parseInt(hexValue.slice(i * 2, i * 2 + 2), 16);
  }
  return output;
}

function hex(value: ArrayBuffer | Uint8Array<ArrayBuffer>): string {
  return Array.from(value instanceof Uint8Array ? value : new Uint8Array(value))
    .map((part) => part.toString(16).padStart(2, '0'))
    .join('');
}

async function loadVector(): Promise<VectorFile> {
  return JSON.parse(await readFile(vectorPath, 'utf8')) as VectorFile;
}

async function derive(entry: EnvelopeVector): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey('raw', bytes(entry.ikmHex), 'HKDF', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: bytes(entry.saltHex),
      info: bytes(entry.infoHex),
    },
    key,
    256,
  );
  return new Uint8Array(derived);
}

async function decrypt(
  entry: EnvelopeVector,
  keyBytes: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
  const clear = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: bytes(entry.nonceHex),
      additionalData: bytes(entry.aadHex),
      tagLength: 128,
    },
    key,
    bytes(entry.ciphertextAndTagHex),
  );
  return new Uint8Array(clear);
}

describe('E2EE v1 interoperability vectors', () => {
  for (const name of ['recoveryEnvelope', 'trustedDeviceTransfer', 'syncEvent'] as const) {
    it(`${name} derives and decrypts with WebCrypto`, async () => {
      const vector = await loadVector();
      const entry = vector[name];
      const derived = await derive(entry);
      expect(hex(derived)).toBe(entry.derivedKeyHex);
      expect(hex(await decrypt(entry, derived))).toBe(entry.plaintextHex);
    });
  }

  it('verifies the canonical Ed25519 device-authentication signature', async () => {
    const vector = await loadVector();
    const entry = vector.deviceAuthentication;
    const publicKey = await crypto.subtle.importKey(
      'raw',
      bytes(entry.publicKeyHex),
      'Ed25519',
      false,
      ['verify'],
    );
    const ok = await crypto.subtle.verify(
      'Ed25519',
      publicKey,
      bytes(entry.signatureHex),
      bytes(entry.transcriptHex),
    );
    expect(ok).toBe(true);
  });
});
