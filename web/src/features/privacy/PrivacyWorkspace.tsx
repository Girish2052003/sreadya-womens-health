'use client';

import { useEffect, useState } from 'react';

import { Card } from '../../components/ui/Card';
import { StatusChip } from '../../components/ui/StatusChip';
import type { NotificationPrivacy } from '../../domain/reminders/reminder-policy';
import { DexieVaultPersistence } from '../../vault/db';
import { VaultService } from '../../vault/vault-service';
import { continuePrivately } from '../onboarding/private-onboarding';
import { ReminderSettingsRepository } from '../reminders/reminder-settings-repository';
import { buildWebPrivacyStatus, type WebPrivacyStatus } from './privacy-status';

const STATUS_LABELS: Record<keyof WebPrivacyStatus, string> = {
  healthDataLocation: 'Health data location',
  developerHealthDatabase: 'Developer health database',
  behaviorAnalytics: 'Behavior analytics',
  databaseProtection: 'Local database protection',
  platformHealthAccess: 'Platform health access',
  partnerLiveAccess: 'Partner live access',
  sync: 'Sync',
  appLock: 'App lock',
  appSwitcherProtection: 'App-switcher protection',
  notificationPrivacy: 'Notification privacy',
  advertisingProfile: 'Advertising profile',
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

      setPrivacy(buildWebPrivacyStatus({ notificationPrivacy: notificationPrivacy(reminderSettings.privacy) }));
      setVaultStatus('Encrypted local vault ready');
      setReady(true);
    })().catch(() => {
      if (cancelled) return;
      setVaultStatus('Local vault unavailable');
      setError('Sreva could not read the local privacy status from this browser.');
      setReady(true);
    });

    return () => {
      cancelled = true;
      vault.lock();
    };
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
          <Card eyebrow="Privacy center" title="What Sreva actually protects here">
            <dl className="privacy-status-list">
              {(Object.keys(STATUS_LABELS) as Array<keyof WebPrivacyStatus>).map((key) => (
                <div key={key} className="privacy-status-row">
                  <dt>{STATUS_LABELS[key]}</dt>
                  <dd>{privacy[key]}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card eyebrow="Truthful boundary" title="Unavailable means unavailable">
            <p>
              This Web build does not claim native biometric locking, guaranteed app-switcher protection,
              or production sync before those reviewed platform and Phase F adapters exist.
            </p>
            <p className="workspace-note">
              Account-free use remains first class. The local encrypted vault is authoritative, and Sreva does not require reproductive-health telemetry to operate.
            </p>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
