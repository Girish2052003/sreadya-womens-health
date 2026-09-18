'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { GENERAL_SETTINGS_KEY } from '../theme/theme-preference';
import { sourceMessage, interpolateMessage, type MessageParams } from './catalog';
import { localeDirection, normalizeLocaleTag } from './locale';
import {
  resolvePublishedLocale,
  type PublishedLocale,
} from './locale-registry';
import { GENERATED_SOURCE_MESSAGES } from './source.generated';

type TranslationStatus = 'source' | 'loading' | 'translated' | 'error';

type I18nContextValue = {
  locale: string;
  status: TranslationStatus;
  availableLocales: PublishedLocale[];
  setLocale: (locale: string) => void;
  t: (key: string, params?: MessageParams, fallback?: string) => string;
  plural: (baseKey: string, count: number, params?: MessageParams, fallback?: string) => string;
  hasTranslation: (locale: string) => boolean;
};

type RuntimeArtifact = {
  locale?: string;
  englishName?: string;
  path: string;
  coverage?: string;
  messageCount?: number;
  sourceMessageCount?: number;
  method?: string;
  reviewStatus?: string;
};

type RuntimeManifest = {
  version?: number;
  sourceLocale?: string;
  sourceVersion?: string;
  publicLocales?: PublishedLocale[];
  artifacts: Record<string, RuntimeArtifact>;
};

const ENGLISH_LOCALE: PublishedLocale = {
  tag: 'en',
  englishName: 'English',
  coverage: 'source',
  method: 'source',
  reviewStatus: 'source-authoritative',
};

const I18nContext = createContext<I18nContextValue | null>(null);
const bundleCache = new Map<string, Record<string, string>>();
let manifestPromise: Promise<RuntimeManifest | null> | null = null;

function localeKey(locale: string): string {
  return normalizeLocaleTag(locale).toLowerCase();
}

function readStoredLocale(): string | null {
  try {
    const raw = window.localStorage.getItem(GENERAL_SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    return typeof parsed.locale === 'string' ? normalizeLocaleTag(parsed.locale) : null;
  } catch {
    return null;
  }
}

function saveStoredLocale(locale: string): void {
  try {
    const raw = window.localStorage.getItem(GENERAL_SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    window.localStorage.setItem(GENERAL_SETTINGS_KEY, JSON.stringify({ ...parsed, locale }));
  } catch {
    window.localStorage.setItem(GENERAL_SETTINGS_KEY, JSON.stringify({ locale }));
  }
}

function publishedLocalesFromManifest(manifest: RuntimeManifest): PublishedLocale[] {
  const explicit = Array.isArray(manifest.publicLocales)
    ? manifest.publicLocales.filter((locale) =>
        locale
        && typeof locale.tag === 'string'
        && typeof locale.englishName === 'string'
        && (locale.coverage === 'source' || locale.coverage === 'complete'))
    : [];

  const derived = Object.values(manifest.artifacts)
    .filter((artifact) => artifact.coverage === 'source' || artifact.coverage === 'complete')
    .map((artifact): PublishedLocale | null => {
      const tag = artifact.locale;
      if (!tag) return null;
      const englishName = artifact.englishName
        ?? (localeKey(tag) === 'en' ? 'English' : tag);
      return {
        tag,
        englishName,
        coverage: artifact.coverage as 'source' | 'complete',
        method: artifact.method ?? (localeKey(tag) === 'en' ? 'source' : 'machine'),
        reviewStatus: artifact.reviewStatus ?? 'machine-unreviewed',
      };
    })
    .filter((locale): locale is PublishedLocale => Boolean(locale));

  const source = explicit.length > 0 ? explicit : derived;
  const byTag = new Map<string, PublishedLocale>();
  for (const locale of [ENGLISH_LOCALE, ...source]) {
    byTag.set(localeKey(locale.tag), locale);
  }
  return [...byTag.values()]
    .sort((a, b) => a.englishName.localeCompare(b.englishName, 'en'));
}

async function loadManifest(): Promise<RuntimeManifest | null> {
  if (manifestPromise) return manifestPromise;
  const basePath = process.env.NEXT_PUBLIC_SREADYA_BASE_PATH ?? '';
  manifestPromise = fetch(`${basePath}/i18n/manifest.json`, { cache: 'no-cache' })
    .then(async (response) => {
      if (!response.ok) return null;
      const raw: unknown = await response.json();
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
      const artifacts = (raw as { artifacts?: unknown }).artifacts;
      if (!artifacts || typeof artifacts !== 'object' || Array.isArray(artifacts)) return null;
      const publicLocales = (raw as { publicLocales?: unknown }).publicLocales;
      return {
        ...(raw as Omit<RuntimeManifest, 'artifacts' | 'publicLocales'>),
        artifacts: artifacts as RuntimeManifest['artifacts'],
        publicLocales: Array.isArray(publicLocales)
          ? publicLocales as PublishedLocale[]
          : undefined,
      };
    })
    .catch(() => null);
  return manifestPromise;
}

async function loadCompleteBundle(
  locale: string,
  manifest: RuntimeManifest,
): Promise<Record<string, string> | null> {
  const normalized = normalizeLocaleTag(locale);
  if (localeKey(normalized) === 'en') return {};

  const candidate = localeKey(normalized);
  const cached = bundleCache.get(candidate);
  if (cached) return cached;

  const artifact = manifest.artifacts[candidate];
  if (
    !artifact?.path
    || artifact.coverage !== 'complete'
    || !artifact.messageCount
    || artifact.messageCount !== artifact.sourceMessageCount
  ) return null;

  const basePath = process.env.NEXT_PUBLIC_SREADYA_BASE_PATH ?? '';
  try {
    const response = await fetch(`${basePath}/${artifact.path}`, { cache: 'force-cache' });
    if (!response.ok) return null;
    const raw: unknown = await response.json();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const bundle = Object.fromEntries(
      Object.entries(raw as Record<string, unknown>)
        .filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    );
    const sourceKeys = Object.keys(GENERATED_SOURCE_MESSAGES);
    if (Object.keys(bundle).length !== sourceKeys.length) return null;
    if (!sourceKeys.every((key) => Object.hasOwn(bundle, key))) return null;
    bundleCache.set(candidate, bundle);
    return bundle;
  } catch {
    return null;
  }
}

function applyDocumentLocale(locale: string): void {
  const normalized = normalizeLocaleTag(locale);
  document.documentElement.lang = normalized;

  // SREADYA's visual composition remains stable. Text direction is handled
  // separately so RTL copy reads correctly without mirroring the product layout.
  document.documentElement.dir = 'ltr';
  document.documentElement.setAttribute('data-sreadya-locale', normalized);
  document.documentElement.setAttribute(
    'data-sreadya-text-direction',
    localeDirection(normalized),
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState('en');
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [status, setTranslationStatus] = useState<TranslationStatus>('source');
  const [availableLocales, setAvailableLocales] = useState<PublishedLocale[]>([ENGLISH_LOCALE]);
  const requestId = useRef(0);

  const activate = useCallback((requestedLocale: string, persist = true) => {
    const id = ++requestId.current;
    setTranslationStatus('loading');

    void (async () => {
      const manifest = await loadManifest();
      if (requestId.current !== id) return;

      if (!manifest) {
        setTranslationStatus('error');
        return;
      }

      const published = publishedLocalesFromManifest(manifest);
      setAvailableLocales(published);
      const resolved = resolvePublishedLocale(requestedLocale, published) ?? ENGLISH_LOCALE;
      const target = normalizeLocaleTag(resolved.tag);

      if (localeKey(target) === 'en') {
        setMessages({});
        setLocaleState('en');
        setTranslationStatus('source');
        applyDocumentLocale('en');
        if (persist) saveStoredLocale('en');
        return;
      }

      const bundle = await loadCompleteBundle(target, manifest);
      if (requestId.current !== id) return;
      if (!bundle) {
        // Fail closed: retain the previous complete locale and never persist
        // an incomplete/corrupt target.
        setTranslationStatus('error');
        return;
      }

      // Atomic switch: messages + language metadata change only after the
      // complete current-source bundle has been verified.
      setMessages(bundle);
      setLocaleState(target);
      applyDocumentLocale(target);
      setTranslationStatus('translated');
      if (persist) saveStoredLocale(target);
    })();
  }, []);

  useEffect(() => {
    const stored = readStoredLocale();
    const detected = navigator.languages?.find(Boolean) ?? navigator.language ?? 'en';
    activate(stored ?? detected, false);
  }, [activate]);

  const t = useCallback((key: string, params: MessageParams = {}, fallback?: string) => {
    const template = messages[key] ?? sourceMessage(key, fallback);
    return interpolateMessage(template, params);
  }, [messages]);

  const plural = useCallback((baseKey: string, count: number, params: MessageParams = {}, fallback?: string) => {
    const category = new Intl.PluralRules(locale).select(count);
    const categoryKey = `${baseKey}.${category}`;
    const otherKey = `${baseKey}.other`;
    const template = messages[categoryKey]
      ?? messages[otherKey]
      ?? sourceMessage(categoryKey, sourceMessage(otherKey, fallback));
    return interpolateMessage(template, { ...params, count });
  }, [locale, messages]);

  const hasTranslation = useCallback((candidate: string) => {
    let key = 'en';
    try { key = localeKey(candidate); } catch { return false; }
    return availableLocales.some((entry) => localeKey(entry.tag) === key);
  }, [availableLocales]);

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    status,
    availableLocales,
    setLocale: (next) => activate(next, true),
    t,
    plural,
    hasTranslation,
  }), [activate, availableLocales, hasTranslation, locale, plural, status, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

const sourceOnlyI18n: I18nContextValue = {
  locale: 'en',
  status: 'source',
  availableLocales: [ENGLISH_LOCALE],
  setLocale: () => {},
  t: (key, params = {}, fallback) => interpolateMessage(sourceMessage(key, fallback), params),
  plural: (baseKey, count, params = {}, fallback) => {
    const category = new Intl.PluralRules('en').select(count);
    const categoryKey = `${baseKey}.${category}`;
    const otherKey = `${baseKey}.other`;
    return interpolateMessage(
      sourceMessage(categoryKey, sourceMessage(otherKey, fallback)),
      { ...params, count },
    );
  },
  hasTranslation: (candidate) => {
    try { return localeKey(candidate) === 'en'; } catch { return false; }
  },
};

export function useI18n(): I18nContextValue {
  return useContext(I18nContext) ?? sourceOnlyI18n;
}
