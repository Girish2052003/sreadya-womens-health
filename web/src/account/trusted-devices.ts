const E2EE_SUITE_V1 = 'SREVA-AES256GCM-HKDFSHA256-ED25519-V1';
const TRANSFER_QR_PREFIX = 'SREVA-TRANSFER-1';

export type TrustedDeviceTransferEnvelope = {
  protocol_version: number;
  suite_id: string;
  account_id: string;
  vault_id: string;
  key_epoch: number;
  enrollment_id: string;
  source_device_id: string;
  target_device_id: string;
  kdf_salt: string;
  nonce: string;
  ciphertext_and_tag: string;
};

export type TrustedDeviceQr = {
  enrollmentId: string;
  transferSecret: Uint8Array<ArrayBuffer>;
};

const encoder = new TextEncoder();

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
  if (value.length === 0 || value.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw new Error('Invalid Sreva trusted-device envelope encoding.');
  }
  try {
    return Uint8Array.from(atob(value), (part) => part.charCodeAt(0));
  } catch {
    throw new Error('Invalid Sreva trusted-device envelope encoding.');
  }
}

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  if (value.length === 0 || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error('Invalid Sreva trusted-device QR payload.');
  }
  const standard = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = standard + '='.repeat((4 - (standard.length % 4)) % 4);
  try {
    return Uint8Array.from(atob(padded), (part) => part.charCodeAt(0));
  } catch {
    throw new Error('Invalid Sreva trusted-device QR payload.');
  }
}

function assertEnvelope(envelope: TrustedDeviceTransferEnvelope): void {
  if (envelope.protocol_version !== 1 || envelope.suite_id !== E2EE_SUITE_V1) {
    throw new Error('Unsupported Sreva trusted-device suite.');
  }
  if (
    envelope.account_id.length === 0 ||
    envelope.vault_id.length === 0 ||
    envelope.enrollment_id.length === 0 ||
    envelope.source_device_id.length === 0 ||
    envelope.target_device_id.length === 0 ||
    !Number.isSafeInteger(envelope.key_epoch) ||
    envelope.key_epoch < 0
  ) {
    throw new Error('Invalid Sreva trusted-device envelope metadata.');
  }
}

function transferContext(domain: string, envelope: TrustedDeviceTransferEnvelope): Uint8Array<ArrayBuffer> {
  return lp16([
    utf8(domain),
    utf8(envelope.account_id),
    utf8(envelope.vault_id),
    utf8(envelope.enrollment_id),
    utf8(envelope.source_device_id),
    utf8(envelope.target_device_id),
    utf8(String(envelope.key_epoch)),
    utf8(envelope.suite_id),
  ]);
}

export function parseTrustedDeviceQr(payload: string): TrustedDeviceQr {
  const parts = payload.split(':');
  if (parts.length !== 3 || parts[0] !== TRANSFER_QR_PREFIX || parts[1].length === 0) {
    throw new Error('Invalid Sreva trusted-device QR payload.');
  }
  const transferSecret = decodeBase64Url(parts[2]);
  if (transferSecret.byteLength !== 32) throw new Error('Sreva transfer secret must be 32 bytes.');
  return { enrollmentId: parts[1], transferSecret };
}

export async function deriveTransferWrapKey(
  transferSecret: Uint8Array<ArrayBuffer>,
  envelope: TrustedDeviceTransferEnvelope,
): Promise<Uint8Array<ArrayBuffer>> {
  assertEnvelope(envelope);
  if (transferSecret.byteLength !== 32) throw new Error('Sreva transfer secret must be 32 bytes.');

  const salt = decodeBase64(envelope.kdf_salt);
  if (salt.byteLength !== 32) throw new Error('Sreva transfer salt must be 32 bytes.');

  const inputKey = await crypto.subtle.importKey('raw', transferSecret, 'HKDF', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: transferContext('sreva-transfer-wrap-key-v1', envelope),
    },
    inputKey,
    256,
  );
  return new Uint8Array(derived);
}

export async function unwrapTrustedDeviceTransfer(
  transferSecret: Uint8Array<ArrayBuffer>,
  envelope: TrustedDeviceTransferEnvelope,
): Promise<Uint8Array<ArrayBuffer>> {
  assertEnvelope(envelope);
  const nonce = decodeBase64(envelope.nonce);
  const ciphertextAndTag = decodeBase64(envelope.ciphertext_and_tag);
  if (nonce.byteLength !== 12) throw new Error('Sreva transfer nonce must be 12 bytes.');
  if (ciphertextAndTag.byteLength < 16) throw new Error('Sreva transfer ciphertext is invalid.');

  const keyBytes = await deriveTransferWrapKey(transferSecret, envelope);
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
  const clear = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: nonce,
      additionalData: transferContext('sreva-device-transfer-envelope-v1', envelope),
      tagLength: 128,
    },
    key,
    ciphertextAndTag,
  );

  const vaultRootSecret = new Uint8Array(clear);
  if (vaultRootSecret.byteLength !== 32) throw new Error('Invalid Sreva vault root secret.');
  return vaultRootSecret;
}
