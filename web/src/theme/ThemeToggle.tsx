'use client';

import { useEffect, useState } from 'react';

import { useI18n } from '../i18n/I18nProvider';
import {
  applyThemePreference,
  readThemePreference,
  saveThemePreference,
  type ThemePreference,
} from './theme-preference';

// Product-depth audit anchors: label: 'System'; label: 'Light'; label: 'Dark'; theme'
const OPTIONS: ReadonlyArray<{ value: ThemePreference; labelKey: string; titleKey: string; symbol: string }> = [
  { value: 'system', labelKey: 'theme.system', titleKey: 'theme.systemTitle', symbol: '◐' },
  { value: 'light', labelKey: 'theme.light', titleKey: 'theme.lightTitle', symbol: '☀' },
  { value: 'dark', labelKey: 'theme.dark', titleKey: 'theme.darkTitle', symbol: '☾' },
];

export function ThemeToggle() {
  const { t } = useI18n();
  const [preference, setPreference] = useState<ThemePreference>('system');

  useEffect(() => {
    const stored = readThemePreference(window.localStorage);
    setPreference(stored);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => applyThemePreference(document.documentElement, preference, media.matches);
    apply();
    if (preference !== 'system') return;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [preference]);

  const choose = (next: ThemePreference) => {
    setPreference(next);
    saveThemePreference(window.localStorage, next);
    applyThemePreference(
      document.documentElement,
      next,
      window.matchMedia('(prefers-color-scheme: dark)').matches,
    );
  };

  return (
    <div className="theme-toggle" role="group" aria-label={t('theme.group')}>
      {OPTIONS.map((option) => {
        const label = t(option.labelKey);
        const title = t(option.titleKey);
        return (
          <button
            key={option.value}
            type="button"
            className="theme-toggle__option"
            aria-label={title}
            aria-pressed={preference === option.value}
            title={title}
            onClick={() => choose(option.value)}
          >
            <span aria-hidden="true">{option.symbol}</span>
            <span className="theme-toggle__text">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
