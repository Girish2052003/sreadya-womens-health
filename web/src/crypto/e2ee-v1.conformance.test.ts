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
    publicRawUncompressedHex: string;
    transcriptHex: string;
    signatureP1363Hex: string;
  };
};

const vectorPath = resolve(process.cwd(), '../shared/crypto/interoperability-vectors/e2ee-v1.json');

function bytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error('Invalid hex length');
  return Uint8Array.from(hex.match(/.{2}/g)?.map((value) => Number.parseInt(value, 16)) ?? []);
}

function hex(value: ArrayBuffer | Uint8Array): string {
  return Array.from(value instanceof Uint8Array ? value : new Uint8Array(value))
    .map((part) => part.toString(16).padStart(2, '0'))
    .join('');
}

async function loadVector(): Promise<VectorFile> {
  return JSON.parse(await readFile(vectorPath, 'utf8')) as VectorFile;
}

async function derive(entry: EnvelopeVector): Promise<Uint8Array> {
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

async function decrypt(entry: EnvelopeVector, keyBytes: Uint8Array): Promise<Uint8Array> {
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

  it('verifies the canonical P-256 device-authentication signature', async () => {
    const vector = await loadVector();
    const entry = vector.deviceAuthentication;
    const publicKey = await crypto.subtle.importKey(
      'raw',
      bytes(entry.publicRawUncompressedHex),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    );
    const ok = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      bytes(entry.signatureP1363Hex),
      bytes(entry.transcriptHex),
    );
    expect(ok).toBe(true);
  });
});
