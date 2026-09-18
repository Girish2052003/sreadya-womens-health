import { describe, expect, it } from 'vitest';

import { sourceMessage, interpolateMessage } from './catalog';
import { LANGUAGE_UNIVERSE_COUNT, currentLanguageChoice, languageChoice } from './locale-registry';
import { localeDirection, normalizeLocaleTag } from './locale';
import { translationAvailability } from './translation-manifest';

describe('SREADYA globalization contract', () => {
  it('keeps the locale universe well above the 500+ product requirement', () => {
    expect(LANGUAGE_UNIVERSE_COUNT).toBeGreaterThanOrEqual(500);
  });

  it('uses standards-based locale identity and script direction', () => {
    expect(normalizeLocaleTag('fi-fi')).toBe('fi-FI');
    expect(localeDirection('ar')).toBe('rtl');
    expect(localeDirection('ta')).toBe('ltr');
    expect(currentLanguageChoice('ar-SA').language).toBe('ar');
  });

  it('derives native names and representative flags without treating a flag as locale identity', () => {
    const finnish = languageChoice('fi');
    expect(finnish.language).toBe('fi');
    expect(finnish.nativeName.length).toBeGreaterThan(1);
    expect(finnish.flag.length).toBeGreaterThan(0);
  });

  it('reports source, machine-partial, and deterministic fallback states truthfully', () => {
    expect(translationAvailability('en').coverage).toBe('source');
    expect(translationAvailability('fi-FI')).toMatchObject({
      available: true,
      coverage: 'partial',
      method: 'machine',
      reviewStatus: 'machine-unreviewed',
    });
    expect(translationAvailability('zu')).toMatchObject({
      available: false,
      coverage: 'fallback',
    });
  });

  it('preserves message variables through the public interpolation facade', () => {
    expect(interpolateMessage(sourceMessage('language.resultCount.other'), { count: 7 })).toContain('7');
    expect(interpolateMessage('Hello {name}', { name: 'Sreadya' })).toBe('Hello Sreadya');
  });
});
