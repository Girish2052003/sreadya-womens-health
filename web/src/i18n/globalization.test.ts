import { describe, expect, it } from 'vitest';

import { sourceMessage, interpolateMessage } from './catalog';
import {
  LANGUAGE_ARCHITECTURE_CAPACITY_COUNT,
  allLanguageChoices,
  currentLanguageChoice,
  languageChoice,
} from './locale-registry';
import { localeDirection, normalizeLocaleTag } from './locale';
import {
  hasCompleteTranslation,
  selectableTranslationLanguages,
  translationAvailability,
} from './translation-manifest';

describe('SREADYA globalization contract', () => {
  it('keeps broad standards capacity separate from public language claims', () => {
    expect(LANGUAGE_ARCHITECTURE_CAPACITY_COUNT).toBeGreaterThanOrEqual(500);
    expect(allLanguageChoices().map((choice) => choice.language)).toEqual(selectableTranslationLanguages());
  });

  it('publishes only complete/source locales and never raw-code display names', () => {
    for (const choice of allLanguageChoices()) {
      expect(hasCompleteTranslation(choice.tag)).toBe(true);
      expect(['source', 'complete']).toContain(translationAvailability(choice.tag).coverage);
      expect(choice.nativeName.toLowerCase()).not.toBe(choice.language.toLowerCase());
      expect(choice.englishName.toLowerCase()).not.toBe(choice.language.toLowerCase());
    }
  });

  it('uses standards-based locale identity and script direction', () => {
    expect(normalizeLocaleTag('fi-fi')).toBe('fi-FI');
    expect(localeDirection('ar')).toBe('rtl');
    expect(localeDirection('ta')).toBe('ltr');
  });

  it('never presents an unsupported persisted locale as a selectable language', () => {
    expect(currentLanguageChoice('aaa').language).toBe('en');
    expect(languageChoice('aaa').language).toBe('en');
  });

  it('derives native names and representative flags for a complete locale', () => {
    const english = languageChoice('en');
    expect(english.language).toBe('en');
    expect(english.nativeName.length).toBeGreaterThan(1);
    expect(english.flag.length).toBeGreaterThan(0);
  });

  it('preserves message variables through the public interpolation facade', () => {
    expect(interpolateMessage(sourceMessage('language.resultCount.other'), { count: 7 })).toContain('7');
    expect(interpolateMessage('Hello {name}', { name: 'Sreadya' })).toBe('Hello Sreadya');
  });
});
