export const SHIPPED_TRANSLATION_LANGUAGES = [
  'en',
  'fi',
  'ta',
  'hi',
  'ar',
] as const;

export type ShippedTranslationLanguage = (typeof SHIPPED_TRANSLATION_LANGUAGES)[number];

export function hasShippedTranslation(locale: string): boolean {
  let language = 'en';
  try { language = new Intl.Locale(locale).language.toLowerCase(); } catch { language = 'en'; }
  return (SHIPPED_TRANSLATION_LANGUAGES as readonly string[]).includes(language);
}
