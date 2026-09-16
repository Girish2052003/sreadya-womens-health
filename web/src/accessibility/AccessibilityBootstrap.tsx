'use client';

import { useEffect } from 'react';

import { applyAccessibilityPreferences, loadAccessibilityPreferences } from './preferences';

export function AccessibilityBootstrap() {
  useEffect(() => {
    const preferences = loadAccessibilityPreferences(window.localStorage);
    applyAccessibilityPreferences(document.documentElement, preferences);
  }, []);

  return null;
}
