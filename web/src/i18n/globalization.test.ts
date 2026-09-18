import { describe, expect, it } from 'vitest';

import { sourceMessage, interpolateMessage } from './catalog';
import {
  allLanguageChoices,
  currentLanguageChoice,
  languageChoice,
  popularLanguageChoices,
  resolvePublishedLocale,
  type PublishedLocale,
} from './locale-registry';
import { localeDirection, normalizeLocaleTag } from './locale';

const published: PublishedLocale[] = [
  {
    tag: 'en',
    englishName: 'English',
    coverage: 'source',
    method: 'source',
    reviewStatus: 'source-authoritative',
  },
  {
    tag: 'ar',
    englishName: 'Arabic',
    coverage: 'complete',
    method: 'machine',
    reviewStatus: 'machine-unreviewed',
  },
  {
    tag: 'ta',
    englishName: 'Tamil',
    coverage: 'complete',
    method: 'machine',
    reviewStatus: 'machine-unreviewed',
  },
  {
    tag: 'zh-CN',
    englishName: 'Chinese (Simplified)',
    coverage: 'complete',
    method: 'machine',
    reviewStatus: 'machine-unreviewed',
  },
];

describe('SREADYA globalization contract', () => {
  it('builds public choices only from already-published complete/source locales', () => {
    expect(allLanguageChoices(published).map((choice) => choice.tag))
      .toEqual(['ar', 'zh-CN', 'en', 'ta']);
  });

  it('never needs a raw locale code as the user-facing language name', () => {
    const obscure = languageChoice({
      tag: 'alz',
      englishName: 'Alur',
      coverage: 'complete',
      method: 'machine',
      reviewStatus: 'machine-unreviewed',
    });
    expect(obscure.englishName).toBe('Alur');
    expect(obscure.nativeName.toLowerCase()).not.toBe('alz');
  });

  it('resolves provider aliases without creating duplicate chooser entries', () => {
    expect(resolvePublishedLocale('zh', published)?.tag).toBe('zh-CN');
    expect(resolvePublishedLocale('zh-CN', published)?.tag).toBe('zh-CN');
  });

  it('falls back to English for an unsupported persisted locale', () => {
    expect(currentLanguageChoice('aaa', published).tag).toBe('en');
  });

  it('keeps suggested chips bounded to languages that are actually published', () => {
    const tags = popularLanguageChoices(published).map((choice) => choice.tag);
    expect(tags).toEqual(['en', 'ta', 'ar', 'zh-CN']);
  });

  it('uses standards-based locale identity and text direction', () => {
    expect(normalizeLocaleTag('fi-fi')).toBe('fi-FI');
    expect(localeDirection('ar')).toBe('rtl');
    expect(localeDirection('ta')).toBe('ltr');
  });

  it('preserves message variables through the public interpolation facade', () => {
    expect(interpolateMessage(sourceMessage('language.resultCount.other'), { count: 7 }))
      .toContain('7');
    expect(interpolateMessage('Hello {name}', { name: 'Sreadya' }))
      .toBe('Hello Sreadya');
  });
});
