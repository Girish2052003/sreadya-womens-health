'use client';

import { useEffect, useState } from 'react';

import messages from '../i18n/messages/en.json';
import { AccessibilityPreferencesPanel } from './AccessibilityPreferencesPanel';
import {
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  applyAccessibilityPreferences,
  loadAccessibilityPreferences,
  saveAccessibilityPreferences,
  type AccessibilityPreferences,
} from './preferences';

export function AccessibilityPreferencesWorkspace() {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>({
    ...DEFAULT_ACCESSIBILITY_PREFERENCES,
  });
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
      <AccessibilityPreferencesPanel
        preferences={preferences}
        saving={false}
        onChange={changePreferences}
        onSave={savePreferences}
      />
      <section className="sreadya-card" aria-labelledby="accessibility-local-title">
        <p className="sreadya-card__eyebrow">Local preference</p>
        <h2 className="sreadya-card__title" id="accessibility-local-title">Stored on this browser</h2>
        <div className="sreadya-card__body">
          <p>These presentation preferences stay in this browser and do not require an account.</p>
          {saved ? <p role="status" className="workspace-note">{messages['accessibility.saved']}</p> : null}
        </div>
      </section>
    </div>
  );
}
