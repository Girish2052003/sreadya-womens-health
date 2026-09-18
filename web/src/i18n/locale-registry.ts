import { localeDirection, normalizeLocaleTag } from './locale';

export type PublishedLocale = {
  tag: string;
  englishName: string;
  coverage: 'source' | 'complete';
  method: string;
  reviewStatus: string;
};

export type LanguageChoice = {
  tag: string;
  nativeName: string;
  englishName: string;
  direction: 'ltr' | 'rtl';
};

export const POPULAR_LANGUAGE_PRIORITY = [
  'en', 'ta', 'hi', 'fi', 'es', 'fr', 'de', 'pt', 'ar', 'ur', 'bn', 'te',
  'ml', 'kn', 'mr', 'gu', 'pa', 'zh-CN', 'zh-TW', 'ja', 'ko', 'tr', 'id', 'sw', 'ru',
] as const;

const PROVIDER_ALIASES: Record<string, string> = {
  zh: 'zh-cn',
  tl: 'fil',
  iw: 'he',
  jw: 'jv',
};

function localeKey(locale: string): string {
  try {
    return normalizeLocaleTag(locale).toLowerCase();
  } catch {
    return locale.trim().toLowerCase();
  }
}

function nativeDisplayName(tag: string, englishName: string): string {
  try {
    const normalized = normalizeLocaleTag(tag);
    const ownLocale = new Intl.Locale(normalized).language;
    const display = new Intl.DisplayNames([normalized], {
      type: 'language',
      languageDisplay: 'standard',
    }).of(normalized);
    if (display && display.toLowerCase() !== normalized.toLowerCase() && display.toLowerCase() !== ownLocale.toLowerCase()) {
      return display;
    }
  } catch {
    // Fall through to the provider's English name. Raw locale codes never become product labels.
  }
  return englishName;
}

export function languageChoice(locale: PublishedLocale): LanguageChoice {
  return {
    tag: normalizeLocaleTag(locale.tag),
    nativeName: nativeDisplayName(locale.tag, locale.englishName),
    englishName: locale.englishName,
    direction: localeDirection(locale.tag),
  };
}

export function allLanguageChoices(locales: readonly PublishedLocale[]): LanguageChoice[] {
  return locales
    .filter((locale) => locale.coverage === 'source' || locale.coverage === 'complete')
    .map(languageChoice)
    .sort((a, b) => a.englishName.localeCompare(b.englishName, 'en'));
}

export function resolvePublishedLocale(
  requestedLocale: string,
  locales: readonly PublishedLocale[],
): PublishedLocale | null {
  const byKey = new Map(locales.map((locale) => [localeKey(locale.tag), locale]));
  let normalized = 'en';
  try {
    normalized = normalizeLocaleTag(requestedLocale);
  } catch {
    normalized = 'en';
  }

  const exact = localeKey(normalized);
  const alias = PROVIDER_ALIASES[exact];
  if (byKey.has(exact)) return byKey.get(exact) ?? null;
  if (alias && byKey.has(alias)) return byKey.get(alias) ?? null;

  try {
    const base = new Intl.Locale(normalized).language.toLowerCase();
    const baseAlias = PROVIDER_ALIASES[base] ?? base;
    if (byKey.has(baseAlias)) return byKey.get(baseAlias) ?? null;

    const sameBase = locales.filter((locale) => {
      try {
        return new Intl.Locale(locale.tag).language.toLowerCase() === base;
      } catch {
        return false;
      }
    });
    if (sameBase.length === 1) return sameBase[0];
  } catch {
    return byKey.get('en') ?? null;
  }

  return byKey.get('en') ?? null;
}

export function currentLanguageChoice(
  locale: string,
  locales: readonly PublishedLocale[],
): LanguageChoice {
  const resolved = resolvePublishedLocale(locale, locales)
    ?? locales.find((entry) => localeKey(entry.tag) === 'en')
    ?? { tag: 'en', englishName: 'English', coverage: 'source', method: 'source', reviewStatus: 'source-authoritative' };
  return languageChoice(resolved);
}

export function popularLanguageChoices(locales: readonly PublishedLocale[]): LanguageChoice[] {
  const byKey = new Map(locales.map((locale) => [localeKey(locale.tag), locale]));
  return POPULAR_LANGUAGE_PRIORITY
    .map((tag) => byKey.get(localeKey(tag)))
    .filter((locale): locale is PublishedLocale => Boolean(locale))
    .map(languageChoice);
}
