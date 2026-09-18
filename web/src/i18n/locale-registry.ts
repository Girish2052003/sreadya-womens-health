import { CLDR_LANGUAGE_CODES } from './cldr-language-codes';
import { localeDirection, normalizeLocaleTag } from './locale';
import { hasCompleteTranslation, selectableTranslationLanguages } from './translation-manifest';

export type LanguageChoice = {
  tag: string;
  language: string;
  nativeName: string;
  englishName: string;
  flag: string;
  direction: 'ltr' | 'rtl';
};

const POPULAR_LANGUAGE_PRIORITY = [
  'en', 'ta', 'hi', 'fi', 'es', 'ru', 'fr', 'de', 'pt', 'ar', 'ur', 'bn', 'te',
  'ml', 'kn', 'mr', 'gu', 'pa', 'zh', 'ja', 'ko', 'tr', 'id', 'sw',
] as const;

// Internal standards capacity. This is deliberately NOT the number advertised to users.
export const LANGUAGE_ARCHITECTURE_CAPACITY_COUNT = CLDR_LANGUAGE_CODES.length;

function displayName(language: string, displayLocale: string): string {
  try {
    return new Intl.DisplayNames([displayLocale], { type: 'language', languageDisplay: 'standard' }).of(language) ?? language;
  } catch {
    try {
      return new Intl.DisplayNames(['en'], { type: 'language', languageDisplay: 'standard' }).of(language) ?? language;
    } catch {
      return language;
    }
  }
}

function flagForRegion(region?: string): string {
  if (!region || !/^[A-Z]{2}$/.test(region)) return '🌐';
  return String.fromCodePoint(...[...region].map((character) => 0x1F1E6 + character.charCodeAt(0) - 65));
}

export function languageChoice(languageCode: string): LanguageChoice {
  const requested = normalizeLocaleTag(languageCode).split('-')[0].toLowerCase();
  const language = hasCompleteTranslation(requested) ? requested : 'en';
  let maximized: Intl.Locale;
  try {
    maximized = new Intl.Locale(language).maximize();
  } catch {
    maximized = new Intl.Locale('en').maximize();
  }
  return {
    tag: language,
    language,
    nativeName: displayName(language, language),
    englishName: displayName(language, 'en'),
    flag: flagForRegion(maximized.region),
    direction: localeDirection(language),
  };
}

export function allLanguageChoices(): LanguageChoice[] {
  return selectableTranslationLanguages()
    .map(languageChoice)
    .filter((choice) => choice.englishName.toLowerCase() !== choice.language.toLowerCase())
    .sort((a, b) => a.englishName.localeCompare(b.englishName, 'en'));
}

export const PUBLIC_LANGUAGE_COUNT = allLanguageChoices().length;

export const POPULAR_LANGUAGE_CODES = POPULAR_LANGUAGE_PRIORITY
  .filter((code) => hasCompleteTranslation(code));

export function currentLanguageChoice(locale: string): LanguageChoice {
  let language = 'en';
  try { language = new Intl.Locale(normalizeLocaleTag(locale)).language.toLowerCase(); } catch { language = 'en'; }
  return languageChoice(language);
}
