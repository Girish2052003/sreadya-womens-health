import { GENERATED_TRANSLATION_AVAILABILITY } from './translation-manifest.generated';

export type TranslationAvailability = {
  available: boolean;
  coverage: 'source' | 'complete' | 'partial' | 'fallback';
  method: string;
  reviewStatus: string;
};

export function translationAvailability(locale: string): TranslationAvailability {
  let language = 'en';
  try { language = new Intl.Locale(locale).language.toLowerCase(); } catch { language = 'en'; }
  const value = GENERATED_TRANSLATION_AVAILABILITY[language as keyof typeof GENERATED_TRANSLATION_AVAILABILITY];
  if (!value) return { available: false, coverage: 'fallback', method: 'fallback', reviewStatus: 'fallback' };
  return { available: true, coverage: value.coverage, method: value.method, reviewStatus: value.reviewStatus };
}

export function hasCompleteTranslation(locale: string): boolean {
  const availability = translationAvailability(locale);
  return availability.available && (availability.coverage === 'source' || availability.coverage === 'complete');
}

export function selectableTranslationLanguages(): string[] {
  return Object.entries(GENERATED_TRANSLATION_AVAILABILITY)
    .filter(([, value]) => value.coverage === 'source' || value.coverage === 'complete')
    .map(([language]) => language)
    .sort();
}

// Backward-compatible name: "shipped" now means safe for full public selection.
export function hasShippedTranslation(locale: string): boolean {
  return hasCompleteTranslation(locale);
}
