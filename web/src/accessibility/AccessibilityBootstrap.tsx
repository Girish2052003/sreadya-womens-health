'use client';

import { useEffect } from 'react';

import { localeDirection } from '../i18n/locale';
import { applyThemePreference, readThemePreference } from '../theme/theme-preference';
import { applyAccessibilityPreferences, loadAccessibilityPreferences } from './preferences';

export function AccessibilityBootstrap() {
  useEffect(() => {
    const preferences = loadAccessibilityPreferences(window.localStorage);
    applyAccessibilityPreferences(document.documentElement, preferences);
    try {
      const raw = window.localStorage.getItem('sreva:general-settings:v1');
      const parsed = raw ? JSON.parse(raw) as Record<string, unknown> : {};
      const theme = readThemePreference(window.localStorage);
      const units = parsed.units === 'imperial' ? 'imperial' : 'metric';
      const time = parsed.time === '12h' || parsed.time === '24h' || parsed.time === 'system' ? parsed.time : 'system';
      const locale = typeof parsed.locale === 'string' && parsed.locale.length <= 35 ? parsed.locale : 'en-FI';
      let normalized = 'en';
      try { normalized = new Intl.Locale(locale).toString(); } catch { normalized = 'en'; }
      applyThemePreference(
        document.documentElement,
        theme,
        window.matchMedia('(prefers-color-scheme: dark)').matches,
      );
      document.documentElement.setAttribute('data-sreva-units', units);
      document.documentElement.setAttribute('data-sreva-time-format', time);
      document.documentElement.setAttribute('data-sreva-locale', normalized);
      document.documentElement.lang = normalized;
      document.documentElement.dir = localeDirection(normalized);
    } catch {
      document.documentElement.lang = 'en';
      document.documentElement.dir = 'ltr';
    }
  }, []);

  return null;
}
