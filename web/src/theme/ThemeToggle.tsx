'use client';

import { useEffect, useState } from 'react';

import {
  applyThemePreference,
  readThemePreference,
  saveThemePreference,
  type ThemePreference,
} from './theme-preference';

const OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string; symbol: string }> = [
  { value: 'system', label: 'System', symbol: '◐' },
  { value: 'light', label: 'Light', symbol: '☀' },
  { value: 'dark', label: 'Dark', symbol: '☾' },
];

export function ThemeToggle() {
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
    <div className="theme-toggle" role="group" aria-label="Appearance">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className="theme-toggle__option"
          aria-label={`${option.label} theme`}
          aria-pressed={preference === option.value}
          title={`${option.label} theme`}
          onClick={() => choose(option.value)}
        >
          <span aria-hidden="true">{option.symbol}</span>
          <span className="theme-toggle__text">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
