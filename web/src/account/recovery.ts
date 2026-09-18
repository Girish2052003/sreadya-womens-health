const E2EE_SUITE_V1 = 'SREADYA-AES256GCM-HKDFSHA256-ED25519-V1';

export type RecoveryEnvelope = {
  protocol_version: number;
  suite_id: string;
  account_id: string;
  vault_id: string;
  key_epoch: number;
  kdf_salt: string;
  nonce: string;
  ciphertext_and_tag: string;
};

const encoder = new TextEncoder();

function utf8(value: string): Uint8Array<ArrayBuffer> {
  return encoder.encode(value);
}

function lp16(fields: readonly Uint8Array<ArrayBuffer>[]): Uint8Array<ArrayBuffer> {
  let length = 0;
  for (const field of fields) {
    if (field.byteLength > 0xffff) throw new Error('Sreadya protocol field is too large.');
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
  if (value.length === 0 || value.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw new Error('Invalid Sreadya recovery envelope encoding.');
  }
  try {
    return Uint8Array.from(atob(value), (part) => part.charCodeAt(0));
  } catch {
    throw new Error('Invalid Sreadya recovery envelope encoding.');
  }
}

function assertEnvelope(envelope: RecoveryEnvelope): void {
  if (envelope.protocol_version !== 1 || envelope.suite_id !== E2EE_SUITE_V1) {
    throw new Error('Unsupported Sreadya recovery suite.');
  }
  if (
    envelope.account_id.length === 0 ||
    envelope.vault_id.length === 0 ||
    !Number.isSafeInteger(envelope.key_epoch) ||
    envelope.key_epoch < 0
  ) {
    throw new Error('Invalid Sreadya recovery envelope metadata.');
  }
}

function recoveryContext(domain: string, envelope: RecoveryEnvelope): Uint8Array<ArrayBuffer> {
  return lp16([
    utf8(domain),
    utf8(envelope.account_id),
    utf8(envelope.vault_id),
    utf8(String(envelope.key_epoch)),
    utf8(envelope.suite_id),
  ]);
}

export async function deriveRecoveryWrapKey(
  recoverySecret: Uint8Array<ArrayBuffer>,
  envelope: RecoveryEnvelope,
): Promise<Uint8Array<ArrayBuffer>> {
  assertEnvelope(envelope);
  if (recoverySecret.byteLength !== 32) throw new Error('Sreadya recovery secret must be 32 bytes.');

  const salt = decodeBase64(envelope.kdf_salt);
  if (salt.byteLength !== 32) throw new Error('Sreadya recovery salt must be 32 bytes.');

  const inputKey = await crypto.subtle.importKey('raw', recoverySecret, 'HKDF', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: recoveryContext('sreadya-recovery-wrap-key-v1', envelope),
    },
    inputKey,
    256,
  );
  return new Uint8Array(derived);
}

export async function unwrapRecoveryEnvelope(
  recoverySecret: Uint8Array<ArrayBuffer>,
  envelope: RecoveryEnvelope,
): Promise<Uint8Array<ArrayBuffer>> {
  assertEnvelope(envelope);
  const nonce = decodeBase64(envelope.nonce);
  const ciphertextAndTag = decodeBase64(envelope.ciphertext_and_tag);
  if (nonce.byteLength !== 12) throw new Error('Sreadya recovery nonce must be 12 bytes.');
  if (ciphertextAndTag.byteLength < 16) throw new Error('Sreadya recovery ciphertext is invalid.');

  const keyBytes = await deriveRecoveryWrapKey(recoverySecret, envelope);
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
  const clear = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: nonce,
      additionalData: recoveryContext('sreadya-recovery-envelope-v1', envelope),
      tagLength: 128,
    },
    key,
    ciphertextAndTag,
  );

  const vaultRootSecret = new Uint8Array(clear);
  if (vaultRootSecret.byteLength !== 32) throw new Error('Invalid Sreadya vault root secret.');
  return vaultRootSecret;
}
