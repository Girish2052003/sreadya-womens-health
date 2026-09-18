import { argon2id, argon2idAsync } from '@noble/hashes/argon2.js';

const FORMAT = 'SREADYA-CYCLEVAULT';
const FORMAT_VERSION = 1;
const KDF_LABEL = 'argon2id-m19MiB-t2-p1';
const CIPHER_LABEL = 'aes-256-gcm';
const SALT_BYTES = 16;
const NONCE_BYTES = 12;
const TAG_BYTES = 16;
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

const ARGON2_OPTIONS = {
  t: 2,
  m: 19 * 1024,
  p: 1,
  dkLen: 32,
  version: 0x13,
} as const;

export type CycleVaultManifestV1 = {
  format: 'SREADYA-CYCLEVAULT';
  formatVersion: 1;
  createdAtUtc: string;
  appVersion: string;
  databaseSchema: number;
  predictionEngine: string;
  kdf: 'argon2id-m19MiB-t2-p1';
  cipher: 'aes-256-gcm';
};

export type CycleVaultPeriodV1 = {
  id: string;
  start: string;
  end: string | null;
  source: string;
  externalId: string | null;
};

export type CycleVaultObservationV1 = {
  id: string;
  kind: string;
  occurredAt: string;
  severity: string | null;
  numericValue: number | null;
  unit: string | null;
  label: string | null;
  note: string | null;
  flowLevel: string | null;
  source: string;
  externalId: string | null;
};

export type CycleVaultPayloadV1 = {
  periods: CycleVaultPeriodV1[];
  observations: CycleVaultObservationV1[];
};

type CycleVaultContainerV1 = {
  manifest: CycleVaultManifestV1;
  salt: string;
  sealedPayload: string;
};

type SealCycleVaultV1Input = {
  manifest: CycleVaultManifestV1;
  payload: CycleVaultPayloadV1;
  passphrase: string;
  salt: Uint8Array;
  nonce: Uint8Array;
};

export function deriveCycleVaultKey(passphrase: string, salt: Uint8Array): Uint8Array {
  requireSalt(salt);
  return argon2id(encoder.encode(passphrase), salt, ARGON2_OPTIONS);
}

export async function deriveCycleVaultKeyAsync(passphrase: string, salt: Uint8Array): Promise<Uint8Array> {
  requireSalt(salt);
  return argon2idAsync(encoder.encode(passphrase), salt, ARGON2_OPTIONS);
}

export async function openCycleVaultV1(containerJson: string, passphrase: string): Promise<CycleVaultPayloadV1> {
  const container = parseContainer(containerJson);
  const salt = fromBase64(container.salt);
  requireSalt(salt);
  const sealed = fromBase64(container.sealedPayload);
  if (sealed.byteLength < NONCE_BYTES + TAG_BYTES) {
    throw new FormatError('CycleVault encrypted payload is malformed.');
  }

  const nonce = sealed.subarray(0, NONCE_BYTES);
  const cipherTextAndTag = sealed.subarray(NONCE_BYTES);
  const aad = encoder.encode(JSON.stringify(container.manifest));
  const keyBytes = await deriveCycleVaultKeyAsync(passphrase, salt);

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      ownedBytes(keyBytes),
      { name: 'AES-GCM' },
      false,
      ['decrypt'],
    );
    const clear = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ownedBytes(nonce),
        additionalData: ownedBytes(aad),
        tagLength: TAG_BYTES * 8,
      },
      key,
      ownedBytes(cipherTextAndTag),
    );
    return parsePayload(decoder.decode(clear));
  } finally {
    keyBytes.fill(0);
  }
}

export async function sealCycleVaultV1(input: SealCycleVaultV1Input): Promise<string> {
  validateManifest(input.manifest);
  validatePayload(input.payload);
  requireSalt(input.salt);
  if (input.nonce.byteLength !== NONCE_BYTES) {
    throw new FormatError(`CycleVault AES-GCM nonce must be ${NONCE_BYTES} bytes.`);
  }
  if (input.passphrase.length < 12) {
    throw new Error('CycleVault recovery passphrase must be at least 12 characters.');
  }

  const manifestJson = JSON.stringify(input.manifest);
  const payloadJson = JSON.stringify(input.payload);
  const keyBytes = await deriveCycleVaultKeyAsync(input.passphrase, input.salt);

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      ownedBytes(keyBytes),
      { name: 'AES-GCM' },
      false,
      ['encrypt'],
    );
    const encrypted = new Uint8Array(await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: ownedBytes(input.nonce),
        additionalData: ownedBytes(encoder.encode(manifestJson)),
        tagLength: TAG_BYTES * 8,
      },
      key,
      ownedBytes(encoder.encode(payloadJson)),
    ));
    const sealed = new Uint8Array(NONCE_BYTES + encrypted.byteLength);
    sealed.set(input.nonce, 0);
    sealed.set(encrypted, NONCE_BYTES);

    const outer: CycleVaultContainerV1 = {
      manifest: input.manifest,
      salt: toBase64(input.salt),
      sealedPayload: toBase64(sealed),
    };
    return JSON.stringify(outer);
  } finally {
    keyBytes.fill(0);
  }
}

function parseContainer(containerJson: string): CycleVaultContainerV1 {
  let decoded: unknown;
  try {
    decoded = JSON.parse(containerJson);
  } catch {
    throw new FormatError('Malformed CycleVault container.');
  }
  if (!isRecord(decoded) || !isRecord(decoded.manifest)) {
    throw new FormatError('CycleVault manifest is missing.');
  }
  const manifest = validateManifest(decoded.manifest);
  if (typeof decoded.salt !== 'string' || typeof decoded.sealedPayload !== 'string') {
    throw new FormatError('CycleVault encrypted payload is missing.');
  }
  return { manifest, salt: decoded.salt, sealedPayload: decoded.sealedPayload };
}

function validateManifest(value: unknown): CycleVaultManifestV1 {
  if (!isRecord(value) || value.format !== FORMAT || value.formatVersion !== FORMAT_VERSION) {
    throw new FormatError('Unsupported CycleVault format.');
  }
  if (
    typeof value.createdAtUtc !== 'string' ||
    typeof value.appVersion !== 'string' ||
    typeof value.databaseSchema !== 'number' ||
    typeof value.predictionEngine !== 'string' ||
    value.kdf !== KDF_LABEL ||
    value.cipher !== CIPHER_LABEL
  ) {
    throw new FormatError('Unsupported CycleVault v1 manifest.');
  }
  return value as CycleVaultManifestV1;
}

function parsePayload(payloadJson: string): CycleVaultPayloadV1 {
  let decoded: unknown;
  try {
    decoded = JSON.parse(payloadJson);
  } catch {
    throw new FormatError('Malformed CycleVault payload.');
  }
  return validatePayload(decoded);
}

function validatePayload(value: unknown): CycleVaultPayloadV1 {
  if (!isRecord(value) || !Array.isArray(value.periods) || !Array.isArray(value.observations)) {
    throw new FormatError('Malformed CycleVault payload.');
  }
  if (!value.periods.every(isPeriod) || !value.observations.every(isObservation)) {
    throw new FormatError('Malformed CycleVault health record.');
  }
  return value as CycleVaultPayloadV1;
}

function isPeriod(value: unknown): value is CycleVaultPeriodV1 {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.start === 'string'
    && (value.end === null || typeof value.end === 'string')
    && typeof value.source === 'string'
    && (value.externalId === null || typeof value.externalId === 'string');
}

function isObservation(value: unknown): value is CycleVaultObservationV1 {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.kind === 'string'
    && typeof value.occurredAt === 'string'
    && (value.severity === null || typeof value.severity === 'string')
    && (value.numericValue === null || typeof value.numericValue === 'number')
    && (value.unit === null || typeof value.unit === 'string')
    && (value.label === null || typeof value.label === 'string')
    && (value.note === null || typeof value.note === 'string')
    && (value.flowLevel === null || typeof value.flowLevel === 'string')
    && typeof value.source === 'string'
    && (value.externalId === null || typeof value.externalId === 'string');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireSalt(salt: Uint8Array) {
  if (salt.byteLength !== SALT_BYTES) {
    throw new FormatError(`CycleVault Argon2id salt must be ${SALT_BYTES} bytes.`);
  }
}

function ownedBytes(input: Uint8Array): Uint8Array<ArrayBuffer> {
  const output = new Uint8Array(new ArrayBuffer(input.byteLength));
  output.set(input);
  return output;
}

function fromBase64(value: string): Uint8Array {
  let binary: string;
  try {
    binary = atob(value);
  } catch {
    throw new FormatError('CycleVault base64 field is malformed.');
  }
  const output = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) output[index] = binary.charCodeAt(index);
  return output;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunk, bytes.length)));
  }
  return btoa(binary);
}

class FormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CycleVaultFormatError';
  }
}
