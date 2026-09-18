import { describe, expect, it } from 'vitest';

import {
  APP_LOCK_STORAGE_KEY,
  getAutoLockMinutes,
  isPinConfigured,
  removePin,
  setAutoLockMinutes,
  setPin,
  verifyPin,
} from './app-lock';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe('Web PIN privacy gate', () => {
  it('stores only a salted verifier and verifies the PIN without using it as the vault key', async () => {
    const storage = new MemoryStorage();
    const salt = new Uint8Array(16).fill(7);
    await setPin(storage as Storage, '2052', 5, salt);

    expect(isPinConfigured(storage as Storage)).toBe(true);
    expect(await verifyPin(storage as Storage, '2052')).toBe(true);
    expect(await verifyPin(storage as Storage, '0000')).toBe(false);

    const raw = storage.getItem(APP_LOCK_STORAGE_KEY) ?? '';
    expect(raw).not.toContain('2052');
    expect(raw).toContain('verifierHex');
  });

  it('supports reviewed automatic-lock intervals and explicit removal', async () => {
    const storage = new MemoryStorage();
    await setPin(storage as Storage, '1234', 5, new Uint8Array(16).fill(4));
    setAutoLockMinutes(storage as Storage, 15);
    expect(getAutoLockMinutes(storage as Storage)).toBe(15);
    removePin(storage as Storage);
    expect(isPinConfigured(storage as Storage)).toBe(false);
  });
});
