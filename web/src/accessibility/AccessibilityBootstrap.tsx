'use client';

import { useEffect } from 'react';

import { applyThemePreference, readThemePreference } from '../theme/theme-preference';
import { applyAccessibilityPreferences, loadAccessibilityPreferences } from './preferences';

export function AccessibilityBootstrap() {
  useEffect(() => {
    const preferences = loadAccessibilityPreferences(window.localStorage);
    applyAccessibilityPreferences(document.documentElement, preferences);
    try {
      const raw = window.localStorage.getItem('sreadya:general-settings:v1');
      const parsed = raw ? JSON.parse(raw) as Record<string, unknown> : {};
      const theme = readThemePreference(window.localStorage);
      const units = parsed.units === 'imperial' ? 'imperial' : 'metric';
      const time = parsed.time === '12h' || parsed.time === '24h' || parsed.time === 'system' ? parsed.time : 'system';
      applyThemePreference(
        document.documentElement,
        theme,
        window.matchMedia('(prefers-color-scheme: dark)').matches,
      );
      document.documentElement.setAttribute('data-sreadya-units', units);
      document.documentElement.setAttribute('data-sreadya-time-format', time);
    } catch {
      // Locale ownership lives in I18nProvider; accessibility bootstrap remains independent.
    }
  }, []);

  return null;
}
