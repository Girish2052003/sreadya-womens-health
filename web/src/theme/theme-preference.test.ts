import { describe, expect, it } from 'vitest';

import {
  GENERAL_SETTINGS_KEY,
  applyThemePreference,
  readThemePreference,
  resolveTheme,
  saveThemePreference,
} from './theme-preference';

class MemoryStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe('theme preference', () => {
  it('defaults safely to system and resolves against the OS preference', () => {
    const storage = new MemoryStorage();
    expect(readThemePreference(storage)).toBe('system');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('system', true)).toBe('dark');
  });

  it('preserves other general settings when a public theme choice is saved', () => {
    const storage = new MemoryStorage();
    storage.setItem(GENERAL_SETTINGS_KEY, JSON.stringify({ units: 'imperial', locale: 'ar-EG' }));
    saveThemePreference(storage, 'dark');
    expect(JSON.parse(storage.getItem(GENERAL_SETTINGS_KEY)!)).toEqual({
      units: 'imperial',
      locale: 'ar-EG',
      theme: 'dark',
    });
  });

  it('applies both the resolved theme and the user preference marker', () => {
    const attrs = new Map<string, string>();
    const target = { setAttribute: (name: string, value: string) => attrs.set(name, value) };
    expect(applyThemePreference(target, 'system', true)).toBe('dark');
    expect(attrs.get('data-sreadya-theme')).toBe('dark');
    expect(attrs.get('data-sreadya-theme-preference')).toBe('system');
  });
});
