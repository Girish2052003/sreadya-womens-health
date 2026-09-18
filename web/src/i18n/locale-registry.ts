import { CLDR_LANGUAGE_CODES } from './cldr-language-codes';
import { localeDirection, normalizeLocaleTag } from './locale';

export type LanguageChoice = {
  tag: string;
  language: string;
  nativeName: string;
  englishName: string;
  flag: string;
  direction: 'ltr' | 'rtl';
};

export const POPULAR_LANGUAGE_CODES = [
  'en', 'ta', 'hi', 'fi', 'es', 'fr', 'de', 'pt', 'ar', 'ur', 'bn', 'te',
  'ml', 'kn', 'mr', 'gu', 'pa', 'zh', 'ja', 'ko', 'ru', 'tr', 'id', 'sw',
] as const;

export const LANGUAGE_UNIVERSE_COUNT = CLDR_LANGUAGE_CODES.length;

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
  const language = normalizeLocaleTag(languageCode).split('-')[0].toLowerCase();
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
  return CLDR_LANGUAGE_CODES
    .filter((code) => code !== 'und')
    .map(languageChoice)
    .sort((a, b) => a.englishName.localeCompare(b.englishName, 'en'));
}

export function currentLanguageChoice(locale: string): LanguageChoice {
  return languageChoice(new Intl.Locale(normalizeLocaleTag(locale)).language);
}
