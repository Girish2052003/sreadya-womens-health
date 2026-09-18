'use client';

import { useEffect, useRef, useState } from 'react';

import { StatusChip } from '../../components/ui/StatusChip';
import type { NotificationPrivacy, ReminderPolicySettings } from '../../domain/reminders/reminder-policy';
import { detectNotificationCapability, type NotificationCapability } from '../../pwa/notification-capability';
import { DexieVaultPersistence } from '../../vault/db';
import { HealthVaultRepository } from '../../vault/health-repository';
import { VaultService } from '../../vault/vault-service';
import { continuePrivately } from '../onboarding/private-onboarding';
import { ReminderHealthPanel } from './ReminderHealthPanel';
import { PersonalReminderPanel } from './PersonalReminderPanel';
import {
  DEFAULT_REMINDER_SETTINGS,
  ReminderSettingsRepository,
} from './reminder-settings-repository';
import { prepareReminderSchedule, type PreparedReminderSchedule } from './reminder-service';
import { ReminderSettingsPanel } from './ReminderSettingsPanel';

type ReminderRuntime = {
  vault: VaultService;
  healthRepository: HealthVaultRepository;
  settingsRepository: ReminderSettingsRepository;
};

function localWallClock(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

function notificationPrivacy(value: string): NotificationPrivacy {
  return value === 'balanced' || value === 'detailed' ? value : 'maximum';
}

function cloneDefaultSettings(): ReminderPolicySettings {
  return { ...DEFAULT_REMINDER_SETTINGS, enabledOffsetsDays: [] };
}

const EMPTY_SCHEDULE: PreparedReminderSchedule = { prediction: null, plans: [] };

export function ReminderWorkspace() {
  const runtimeRef = useRef<ReminderRuntime | null>(null);
  const [settings, setSettings] = useState<ReminderPolicySettings>(cloneDefaultSettings);
  const [schedule, setSchedule] = useState<PreparedReminderSchedule>(EMPTY_SCHEDULE);
  const [capability, setCapability] = useState<NotificationCapability>(() => detectNotificationCapability('maximum'));
  const [vaultStatus, setVaultStatus] = useState('Opening encrypted local vault…');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const vault = new VaultService(new DexieVaultPersistence());

    void (async () => {
      await continuePrivately(vault);
      const healthRepository = new HealthVaultRepository(vault);
      const settingsRepository = new ReminderSettingsRepository(vault);
      const loaded = await settingsRepository.load();
      const prepared = await prepareReminderSchedule(healthRepository, loaded, localWallClock());
      if (cancelled) return;

      runtimeRef.current = { vault, healthRepository, settingsRepository };
      setSettings(loaded);
      setSchedule(prepared);
      setCapability(detectNotificationCapability(notificationPrivacy(loaded.privacy)));
      setVaultStatus('Encrypted local vault ready');
      setReady(true);
    })().catch(() => {
      if (cancelled) return;
      setVaultStatus('Local vault unavailable');
      setError('Sreadya could not open the encrypted local reminder settings in this browser.');
      setReady(true);
    });

    return () => {
      cancelled = true;
      runtimeRef.current = null;
      vault.lock();
    };
  }, []);

  const changeSettings = (next: ReminderPolicySettings) => {
    setSettings(next);
    setCapability(detectNotificationCapability(notificationPrivacy(next.privacy)));
  };

  const saveSettings = async () => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    setSaving(true);
    setError('');
    try {
      await runtime.settingsRepository.save(settings);
      const prepared = await prepareReminderSchedule(
        runtime.healthRepository,
        settings,
        localWallClock(),
      );
      setSchedule(prepared);
      setCapability(detectNotificationCapability(notificationPrivacy(settings.privacy)));
      setVaultStatus('Saved locally · encrypted');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sreadya could not save the local reminder settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="account-free-core" data-testid="reminder-workspace" aria-busy={!ready}>
      <div className="account-free-core__status">
        <StatusChip tone={error ? 'danger' : ready ? 'success' : 'info'}>{vaultStatus}</StatusChip>
        <span className="workspace-note">Account-free · local reminder policy · local authoritative data</span>
      </div>

      {error ? <p className="core-error" role="alert">{error}</p> : null}

      {ready && !error ? (
        <>
          <ReminderSettingsPanel
            settings={settings}
            saving={saving}
            onChange={changeSettings}
            onSave={() => { void saveSettings(); }}
          />
          <ReminderHealthPanel
            capability={capability}
            privacy={notificationPrivacy(settings.privacy)}
            nextReminder={schedule.plans[0] ?? null}
          />
          <PersonalReminderPanel />
          {!schedule.prediction ? (
            <p className="workspace-note reminder-no-prediction">
              More cycle history is needed before a cycle-relative reminder date can be prepared. No date is invented.
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
