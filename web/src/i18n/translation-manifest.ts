import { GENERATED_TRANSLATION_AVAILABILITY } from './translation-manifest.generated';
import { normalizeLocaleTag } from './locale';

export type TranslationAvailability = {
  available: boolean;
  coverage: 'source' | 'complete' | 'partial' | 'fallback';
  method: string;
  reviewStatus: string;
};

type GeneratedAvailabilityValue = {
  locale?: string;
  coverage: 'source' | 'complete' | 'partial';
  method: string;
  reviewStatus: string;
  provider?: string;
  englishName?: string;
};

const generatedAvailability = GENERATED_TRANSLATION_AVAILABILITY as Record<string, GeneratedAvailabilityValue>;

const ALIASES: Record<string, string> = {
  zh: 'zh-cn',
  tl: 'fil',
  iw: 'he',
  jw: 'jv',
};

function candidates(locale: string): string[] {
  try {
    const normalized = normalizeLocaleTag(locale).toLowerCase();
    const language = new Intl.Locale(normalized).language.toLowerCase();
    const values = [normalized, ALIASES[normalized], language, ALIASES[language]]
      .filter((value): value is string => Boolean(value));
    return [...new Set(values)];
  } catch {
    return ['en'];
  }
}

export function translationAvailability(locale: string): TranslationAvailability {
  for (const candidate of candidates(locale)) {
    const value = generatedAvailability[candidate];
    if (value) {
      return {
        available: true,
        coverage: value.coverage,
        method: value.method,
        reviewStatus: value.reviewStatus,
      };
    }
  }
  return {
    available: false,
    coverage: 'fallback',
    method: 'fallback',
    reviewStatus: 'fallback',
  };
}

export function hasCompleteTranslation(locale: string): boolean {
  const availability = translationAvailability(locale);
  return availability.available
    && (availability.coverage === 'source' || availability.coverage === 'complete');
}

export function selectableTranslationLanguages(): string[] {
  return Object.entries(generatedAvailability)
    .filter(([, value]) => value.coverage === 'source' || value.coverage === 'complete')
    .map(([tag, value]) => value.locale ?? tag)
    .sort((a, b) => a.localeCompare(b, 'en'));
}

export function hasShippedTranslation(locale: string): boolean {
  return hasCompleteTranslation(locale);
}
