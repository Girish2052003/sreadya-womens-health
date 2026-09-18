'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AccessibilityPreferencesWorkspace } from '../../accessibility/AccessibilityPreferencesWorkspace';
import { localeDirection } from '../../i18n/locale';
import { applyThemePreference, GENERAL_SETTINGS_KEY } from '../../theme/theme-preference';
import { AppLockSettings } from '../../privacy/AppLockSettings';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

type Preferences = {
  theme: 'system' | 'light' | 'dark';
  units: 'metric' | 'imperial';
  time: 'system' | '12h' | '24h';
  locale: string;
};

const KEY = GENERAL_SETTINGS_KEY;
const defaults: Preferences = { theme: 'system', units: 'metric', time: 'system', locale: 'en-FI' };

function applyLocale(locale: string) {
  let normalized = 'en';
  try { normalized = new Intl.Locale(locale).toString(); } catch { normalized = 'en'; }
  document.documentElement.lang = normalized;
  document.documentElement.dir = localeDirection(normalized);
  document.documentElement.setAttribute('data-sreva-locale', normalized);
}

function applyTheme(theme: Preferences['theme']) {
  applyThemePreference(
    document.documentElement,
    theme,
    window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
}

function applyGeneralPreferences(preferences: Preferences) {
  applyTheme(preferences.theme);
  applyLocale(preferences.locale);
  document.documentElement.setAttribute('data-sreva-units', preferences.units);
  document.documentElement.setAttribute('data-sreva-time-format', preferences.time);
}

export function SettingsWorkspace() {
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) as Partial<Preferences> : {};
      const next: Preferences = {
        theme: parsed.theme === 'dark' || parsed.theme === 'light' || parsed.theme === 'system' ? parsed.theme : defaults.theme,
        units: parsed.units === 'imperial' ? 'imperial' : 'metric',
        time: parsed.time === '12h' || parsed.time === '24h' || parsed.time === 'system' ? parsed.time : 'system',
        locale: typeof parsed.locale === 'string' && parsed.locale.length <= 35 ? parsed.locale : defaults.locale,
      };
      setPreferences(next);
      applyGeneralPreferences(next);
    } catch {
      setPreferences(defaults);
      applyGeneralPreferences(defaults);
    }
  }, []);

  const save = () => {
    localStorage.setItem(KEY, JSON.stringify(preferences));
    applyGeneralPreferences(preferences);
    setSaved(true);
  };

  return (
    <>
      <div className="workspace-grid">
        <Card eyebrow="Appearance & worldwide format" title="General settings">
          <div className="settings-grid">
            <label><span>Appearance</span><select value={preferences.theme} onChange={(e) => { setPreferences({ ...preferences, theme: e.target.value as Preferences['theme'] }); setSaved(false); }}>
              <option value="system">Follow system</option><option value="light">Light</option><option value="dark">Dark</option>
            </select></label>
            <label><span>Units</span><select value={preferences.units} onChange={(e) => { setPreferences({ ...preferences, units: e.target.value as Preferences['units'] }); setSaved(false); }}>
              <option value="metric">Metric</option><option value="imperial">Imperial</option>
            </select></label>
            <label><span>Time format</span><select value={preferences.time} onChange={(e) => { setPreferences({ ...preferences, time: e.target.value as Preferences['time'] }); setSaved(false); }}>
              <option value="system">Follow locale</option><option value="12h">12-hour</option><option value="24h">24-hour</option>
            </select></label>
            <label><span>Formatting locale</span><input value={preferences.locale} maxLength={35} onChange={(e) => { setPreferences({ ...preferences, locale: e.target.value }); setSaved(false); }} /></label>
          </div>
          <div className="continuity-actions">
            <Button onClick={save}>Save general settings</Button>
          </div>
          {saved ? <p role="status" className="workspace-note">Saved in this browser.</p> : null}
          <p className="workspace-note">English is the currently reviewed message catalogue. Locale selection controls browser formatting and does not pretend an unreviewed translation exists.</p>
        </Card>
        <Card eyebrow="All controls" title="Privacy, reminders, backup & continuity">
          <div className="settings-links">
            <Link href="/app/reminders">Notifications & reminders</Link>
            <Link href="/app/privacy">Privacy Center</Link>
            <Link href="/app/vault">Backup & restore</Link>
            <Link href="/app/sync">Encrypted sync</Link>
            <Link href="/app/devices">Devices</Link>
            <Link href="/app/account">Account</Link>
            <Link href="/app/diagnostics">Diagnostics</Link>
            <Link href="/help">Help</Link>
          </div>
          <p className="workspace-note">Native HealthKit and Health Connect are not exposed by browser APIs. Use native clients for those platform integrations; Web remains fully usable with manual/local records and CycleVault.</p>
        </Card>
      </div>
      <div style={{ marginTop: 16 }}><AppLockSettings /></div>
      <div style={{ marginTop: 16 }}><AccessibilityPreferencesWorkspace /></div>
    </>
  );
}
