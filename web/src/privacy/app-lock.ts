export type AppLockStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type AppLockRecord = {
  version: 1;
  saltHex: string;
  verifierHex: string;
  iterations: number;
  autoLockMinutes: number;
};

export const APP_LOCK_STORAGE_KEY = 'sreadya:web-app-lock:v1';
const DEFAULT_ITERATIONS = 210_000;
const ALLOWED_AUTO_LOCK = new Set([1, 5, 15, 30]);

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[0-9a-f]+$/i.test(value) || value.length % 2 !== 0) throw new Error('Invalid app-lock verifier.');
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function parseRecord(raw: string | null): AppLockRecord | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<AppLockRecord>;
    if (
      value.version !== 1
      || typeof value.saltHex !== 'string'
      || typeof value.verifierHex !== 'string'
      || !Number.isInteger(value.iterations)
      || (value.iterations ?? 0) < 100_000
      || !Number.isInteger(value.autoLockMinutes)
      || !ALLOWED_AUTO_LOCK.has(value.autoLockMinutes ?? -1)
    ) return null;
    return value as AppLockRecord;
  } catch {
    return null;
  }
}

async function deriveVerifier(pin: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<string> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    hash: 'SHA-256',
    salt,
    iterations,
  }, material, 256);
  return bytesToHex(new Uint8Array(bits));
}

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function assertPin(pin: string): void {
  if (!/^\d{4,12}$/.test(pin)) throw new Error('Use a PIN containing 4 to 12 digits.');
}

export function readAppLock(storage: Pick<Storage, 'getItem'>): AppLockRecord | null {
  return parseRecord(storage.getItem(APP_LOCK_STORAGE_KEY));
}

export function isPinConfigured(storage: Pick<Storage, 'getItem'>): boolean {
  return readAppLock(storage) !== null;
}

export function getAutoLockMinutes(storage: Pick<Storage, 'getItem'>): number {
  return readAppLock(storage)?.autoLockMinutes ?? 5;
}

export async function setPin(
  storage: AppLockStorage,
  pin: string,
  autoLockMinutes = 5,
  saltInput?: Uint8Array<ArrayBuffer>,
): Promise<void> {
  assertPin(pin);
  if (!ALLOWED_AUTO_LOCK.has(autoLockMinutes)) throw new Error('Unsupported automatic-lock interval.');
  const salt = saltInput ?? crypto.getRandomValues(new Uint8Array(16));
  const verifierHex = await deriveVerifier(pin, salt, DEFAULT_ITERATIONS);
  storage.setItem(APP_LOCK_STORAGE_KEY, JSON.stringify({
    version: 1,
    saltHex: bytesToHex(salt),
    verifierHex,
    iterations: DEFAULT_ITERATIONS,
    autoLockMinutes,
  } satisfies AppLockRecord));
}

export async function verifyPin(storage: Pick<Storage, 'getItem'>, pin: string): Promise<boolean> {
  const record = readAppLock(storage);
  if (!record) return true;
  if (!/^\d{4,12}$/.test(pin)) return false;
  const actual = await deriveVerifier(pin, hexToBytes(record.saltHex), record.iterations);
  return safeEqual(actual, record.verifierHex);
}

export function setAutoLockMinutes(storage: AppLockStorage, minutes: number): void {
  if (!ALLOWED_AUTO_LOCK.has(minutes)) throw new Error('Unsupported automatic-lock interval.');
  const record = readAppLock(storage);
  if (!record) throw new Error('Configure a PIN before changing automatic lock.');
  storage.setItem(APP_LOCK_STORAGE_KEY, JSON.stringify({ ...record, autoLockMinutes: minutes }));
}

export function removePin(storage: AppLockStorage): void {
  storage.removeItem(APP_LOCK_STORAGE_KEY);
}
