import { describe, expect, it } from 'vitest';

import {
  ACCESSIBILITY_STORAGE_KEY,
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  accessibilityDataAttributes,
  applyAccessibilityPreferences,
  loadAccessibilityPreferences,
  parseAccessibilityPreferences,
  saveAccessibilityPreferences,
  type AccessibilityPreferences,
} from './preferences';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    storage: {
      getItem(key: string) {
        return values.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        values.set(key, value);
      },
    },
  };
}

describe('accessibility preferences', () => {
  it('defaults safely when no valid versioned preference record exists', () => {
    expect(parseAccessibilityPreferences(null)).toEqual(DEFAULT_ACCESSIBILITY_PREFERENCES);
    expect(parseAccessibilityPreferences('not json')).toEqual(DEFAULT_ACCESSIBILITY_PREFERENCES);
    expect(parseAccessibilityPreferences(JSON.stringify({ version: 2, textScale: 'large' }))).toEqual(
      DEFAULT_ACCESSIBILITY_PREFERENCES,
    );
    expect(
      parseAccessibilityPreferences(
        JSON.stringify({ version: 1, textScale: 'huge', motion: 'reduced', contrast: 'high' }),
      ),
    ).toEqual(DEFAULT_ACCESSIBILITY_PREFERENCES);
  });

  it('migrates the earlier v1 preference shape with easy language safely off', () => {
    const legacy = JSON.stringify({ version: 1, textScale: 'large', motion: 'reduced', contrast: 'high' });
    expect(parseAccessibilityPreferences(legacy)).toEqual({
      textScale: 'large',
      motion: 'reduced',
      contrast: 'high',
      easyLanguage: false,
    });
  });

  it('persists only the reviewed non-health presentation preferences on this device', () => {
    const { values, storage } = memoryStorage();
    const preferences: AccessibilityPreferences = {
      textScale: 'large',
      motion: 'reduced',
      contrast: 'high',
      easyLanguage: true,
    };

    saveAccessibilityPreferences(preferences, storage);

    expect(loadAccessibilityPreferences(storage)).toEqual(preferences);
    expect(JSON.parse(values.get(ACCESSIBILITY_STORAGE_KEY)!)).toEqual({ version: 1, ...preferences });
  });

  it('maps preferences to a constrained document attribute contract', () => {
    expect(
      accessibilityDataAttributes({ textScale: 'large', motion: 'reduced', contrast: 'high', easyLanguage: true }),
    ).toEqual({
      'data-sreadya-text-scale': 'large',
      'data-sreadya-motion': 'reduced',
      'data-sreadya-contrast': 'high',
      'data-sreadya-language-mode': 'easy',
    });

    expect(accessibilityDataAttributes(DEFAULT_ACCESSIBILITY_PREFERENCES)).toEqual({
      'data-sreadya-text-scale': 'normal',
      'data-sreadya-motion': 'system',
      'data-sreadya-contrast': 'system',
      'data-sreadya-language-mode': 'standard',
    });
  });

  it('applies only the reviewed accessibility data attributes to a document target', () => {
    const applied = new Map<string, string>();
    const target = {
      setAttribute(name: string, value: string) {
        applied.set(name, value);
      },
    };

    applyAccessibilityPreferences(target, {
      textScale: 'large',
      motion: 'reduced',
      contrast: 'high',
      easyLanguage: true,
    });

    expect(Object.fromEntries(applied)).toEqual({
      'data-sreadya-text-scale': 'large',
      'data-sreadya-motion': 'reduced',
      'data-sreadya-contrast': 'high',
      'data-sreadya-language-mode': 'easy',
    });
  });
});
