'use client';

import { useEffect, useState } from 'react';

import { useI18n } from '../i18n/I18nProvider';
import { AccessibilityPreferencesPanel } from './AccessibilityPreferencesPanel';
import {
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  applyAccessibilityPreferences,
  loadAccessibilityPreferences,
  saveAccessibilityPreferences,
  type AccessibilityPreferences,
} from './preferences';

export function AccessibilityPreferencesWorkspace() {
  const { t } = useI18n();
  const [preferences, setPreferences] = useState<AccessibilityPreferences>({ ...DEFAULT_ACCESSIBILITY_PREFERENCES });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = loadAccessibilityPreferences(window.localStorage);
    setPreferences(stored);
    applyAccessibilityPreferences(document.documentElement, stored);
  }, []);

  function changePreferences(next: AccessibilityPreferences) {
    setPreferences(next);
    setSaved(false);
    applyAccessibilityPreferences(document.documentElement, next);
  }

  function savePreferences() {
    saveAccessibilityPreferences(preferences, window.localStorage);
    setSaved(true);
  }

  return (
    <div className="workspace-grid accessibility-workspace">
      <AccessibilityPreferencesPanel preferences={preferences} saving={false} onChange={changePreferences} onSave={savePreferences} />
      <section className="sreadya-card" aria-labelledby="accessibility-local-title">
        <p className="sreadya-card__eyebrow">{t('accessibility.local.eyebrow')}</p>
        <h2 className="sreadya-card__title" id="accessibility-local-title">{t('accessibility.local.title')}</h2>
        <div className="sreadya-card__body">
          <p>{t('accessibility.local.body')}</p>
          {saved ? <p role="status" className="workspace-note">{t('accessibility.saved')}</p> : null}
        </div>
      </section>
    </div>
  );
}
