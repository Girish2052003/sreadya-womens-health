export type MessageLocale = string;
export type LocaleDirection = 'ltr' | 'rtl';
export type TimeFormatPreference = '12h' | '24h';

const RTL_SCRIPTS = new Set([
  'Adlm', 'Arab', 'Hebr', 'Mand', 'Nkoo', 'Rohg', 'Samr', 'Syrc', 'Thaa', 'Yezi',
]);

function toDate(value: Date | string | number): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new RangeError('Invalid date value.');
  return date;
}

export function normalizeLocaleTag(locale?: string | null): string {
  if (!locale) return 'en';
  try {
    return new Intl.Locale(locale).toString();
  } catch {
    return 'en';
  }
}

function normalizedLocale(locale: string): Intl.Locale {
  return new Intl.Locale(normalizeLocaleTag(locale));
}

export function messageLocale(locale?: string | null): MessageLocale {
  return normalizeLocaleTag(locale);
}

export function localeDirection(locale: string): LocaleDirection {
  try {
    const maximized = normalizedLocale(locale).maximize();
    return maximized.script && RTL_SCRIPTS.has(maximized.script) ? 'rtl' : 'ltr';
  } catch {
    return 'ltr';
  }
}

export function formatLocaleDate(
  value: Date | string | number,
  locale: string,
  timeZone?: string,
): string {
  return new Intl.DateTimeFormat(normalizeLocaleTag(locale), {
    dateStyle: 'medium',
    ...(timeZone ? { timeZone } : {}),
  }).format(toDate(value));
}

export function formatLocaleDateLong(
  value: Date | string | number,
  locale: string,
  timeZone?: string,
): string {
  const normalized = normalizeLocaleTag(locale);
  const language = new Intl.Locale(normalized).language.toLowerCase();
  return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : normalized, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(timeZone ? { timeZone } : {}),
  }).format(toDate(value));
}

export function isEnglishLocale(locale: string): boolean {
  return new Intl.Locale(normalizeLocaleTag(locale)).language.toLowerCase() === 'en';
}

export function formatLocaleTime(
  value: Date | string | number,
  locale: string,
  preference: TimeFormatPreference,
  timeZone?: string,
): string {
  return new Intl.DateTimeFormat(normalizeLocaleTag(locale), {
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: preference === '12h' ? 'h12' : 'h23',
    ...(timeZone ? { timeZone } : {}),
  }).format(toDate(value));
}

export function formatLocaleUnit(value: number, unit: string, locale: string): string {
  return new Intl.NumberFormat(normalizeLocaleTag(locale), {
    style: 'unit',
    unit,
    unitDisplay: 'short',
  }).format(value);
}
