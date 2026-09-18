'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Card } from '../../components/ui/Card';
import { StatusChip } from '../../components/ui/StatusChip';
import type { NotificationPrivacy } from '../../domain/reminders/reminder-policy';
import { isPinConfigured } from '../../privacy/app-lock';
import { DexieVaultPersistence } from '../../vault/db';
import { VaultService } from '../../vault/vault-service';
import { continuePrivately } from '../onboarding/private-onboarding';
import { ReminderSettingsRepository } from '../reminders/reminder-settings-repository';
import { buildWebPrivacyStatus, type WebPrivacyStatus } from './privacy-status';

const STATUS_LABELS: Record<keyof WebPrivacyStatus, string> = {
  healthDataLocation: 'Health data location', developerHealthDatabase: 'Developer health database',
  behaviorAnalytics: 'Behavior analytics', databaseProtection: 'Local database protection',
  platformHealthAccess: 'Platform health access', partnerLiveAccess: 'Partner live access', sync: 'Sync',
  appLock: 'App lock', appSwitcherProtection: 'App-switcher protection',
  notificationPrivacy: 'Notification privacy', advertisingProfile: 'Advertising profile',
};

function notificationPrivacy(value: string): NotificationPrivacy {
  return value === 'balanced' || value === 'detailed' ? value : 'maximum';
}

export function PrivacyWorkspace() {
  const [privacy, setPrivacy] = useState<WebPrivacyStatus | null>(null);
  const [vaultStatus, setVaultStatus] = useState('Opening encrypted local vault…');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const vault = new VaultService(new DexieVaultPersistence());

    void (async () => {
      await continuePrivately(vault);
      const reminderSettings = await new ReminderSettingsRepository(vault).load();
      if (cancelled) return;
      setPrivacy(buildWebPrivacyStatus({
        notificationPrivacy: notificationPrivacy(reminderSettings.privacy),
        appLockConfigured: isPinConfigured(window.localStorage),
      }));
      setVaultStatus('Encrypted local vault ready');
      setReady(true);
    })().catch(() => {
      if (cancelled) return;
      setVaultStatus('Local vault unavailable');
      setError('Sreadya could not read the local privacy status from this browser.');
      setReady(true);
    });

    return () => { cancelled = true; vault.lock(); };
  }, []);

  return (
    <section className="account-free-core" data-testid="privacy-workspace" aria-busy={!ready}>
      <div className="account-free-core__status">
        <StatusChip tone={error ? 'danger' : ready ? 'success' : 'info'}>{vaultStatus}</StatusChip>
        <span className="workspace-note">Account-free · local privacy status · no health telemetry</span>
      </div>
      {error ? <p className="core-error" role="alert">{error}</p> : null}

      {ready && privacy ? (
        <div className="workspace-grid">
          <Card eyebrow="Privacy center" title="What Sreadya actually protects here">
            <dl className="privacy-status-list">
              {(Object.keys(STATUS_LABELS) as Array<keyof WebPrivacyStatus>).map((key) => (
                <div key={key} className="privacy-status-row"><dt>{STATUS_LABELS[key]}</dt><dd>{privacy[key]}</dd></div>
              ))}
            </dl>
          </Card>

          <Card eyebrow="Data controls" title="Review, export, revoke or recover">
            <div className="settings-links">
              <Link href="/app/vault">Encrypted backup & export</Link>
              <Link href="/app/devices">Review connected devices</Link>
              <Link href="/app/sharing">Review / revoke partner sharing</Link>
              <Link href="/app/account">Account & deletion boundary</Link>
              <Link href="/app/diagnostics">Sanitized diagnostics</Link>
              <Link href="/app/reminders">Notification privacy</Link>
              <Link href="/app/settings">PIN lock & accessibility</Link>
            </div>
          </Card>

          <Card eyebrow="Why is this stored?" title="Storage transparency">
            <p><strong>Health records:</strong> encrypted locally so Sreadya can show the history, calculations, reports and reminders you asked for.</p>
            <p><strong>Preferences:</strong> stored locally so reminder privacy, life stage, accessibility and PIN-lock choices persist on this browser.</p>
            <p><strong>Optional sync state:</strong> only opaque identifiers, queue metadata and ciphertext are used when continuity is configured.</p>
            <p><strong>Technical diagnostics:</strong> generated only on request from allowlisted non-health technical fields.</p>
          </Card>

          <Card eyebrow="Truthful boundary" title="Platform protections are not exaggerated">
            <p>Web PIN locking is available, but Sreadya does not call it native biometric security. The browser controls screenshots and app-switcher previews, and native HealthKit / Health Connect require the native clients.</p>
            <p className="workspace-note">Account-free use remains first class. The encrypted local vault is authoritative, and Sreadya does not require reproductive-health telemetry to operate.</p>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
