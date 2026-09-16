export type MessageLocale = 'en';
export type LocaleDirection = 'ltr' | 'rtl';
export type TimeFormatPreference = '12h' | '24h';

const RTL_LANGUAGES = new Set(['ar', 'fa', 'he', 'ur']);

function toDate(value: Date | string | number): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new RangeError('Invalid date value.');
  return date;
}

function normalizedLocale(locale: string): Intl.Locale {
  try {
    return new Intl.Locale(locale);
  } catch {
    return new Intl.Locale('en');
  }
}

export function messageLocale(locale?: string | null): MessageLocale {
  // English is the only reviewed message catalog in Task 15. Formatting may
  // follow another BCP-47 locale, but copy must not pretend a translation exists.
  if (locale) normalizedLocale(locale);
  return 'en';
}

export function localeDirection(locale: string): LocaleDirection {
  const language = normalizedLocale(locale).language.toLowerCase();
  return RTL_LANGUAGES.has(language) ? 'rtl' : 'ltr';
}

export function formatLocaleDate(
  value: Date | string | number,
  locale: string,
  timeZone?: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    ...(timeZone ? { timeZone } : {}),
  }).format(toDate(value));
}

export function formatLocaleTime(
  value: Date | string | number,
  locale: string,
  preference: TimeFormatPreference,
  timeZone?: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: preference === '12h' ? 'h12' : 'h23',
    ...(timeZone ? { timeZone } : {}),
  }).format(toDate(value));
}

export function formatLocaleUnit(value: number, unit: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit,
    unitDisplay: 'short',
  }).format(value);
}
