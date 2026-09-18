import type { VaultEnvelopeV1 } from '../vault/vault-types';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToArrayBuffer(value: string): ArrayBuffer {
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

export async function generateVaultKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function sealJson(
  key: CryptoKey,
  value: unknown,
  aad: string,
): Promise<VaultEnvelopeV1> {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const clear = encoder.encode(JSON.stringify(value));
  const aadBytes = encoder.encode(aad);
  const sealed = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, additionalData: aadBytes, tagLength: 128 },
    key,
    clear,
  );

  return {
    version: 1,
    algorithm: 'AES-GCM',
    nonce: bytesToBase64(nonce),
    aad,
    ciphertext: bytesToBase64(new Uint8Array(sealed)),
  };
}

export async function openJson<T>(
  key: CryptoKey,
  envelope: VaultEnvelopeV1,
  expectedAad: string,
): Promise<T> {
  if (envelope.version !== 1 || envelope.algorithm !== 'AES-GCM') {
    throw new Error('Unsupported Sreadya vault envelope.');
  }
  if (envelope.aad !== expectedAad) {
    throw new Error('Sreadya vault AAD mismatch.');
  }

  const clear = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: base64ToArrayBuffer(envelope.nonce),
      additionalData: encoder.encode(expectedAad),
      tagLength: 128,
    },
    key,
    base64ToArrayBuffer(envelope.ciphertext),
  );

  return JSON.parse(decoder.decode(clear)) as T;
}
