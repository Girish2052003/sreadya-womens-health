'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusChip } from '../../components/ui/StatusChip';
import { DexieVaultPersistence } from '../../vault/db';
import { VaultService } from '../../vault/vault-service';
import { continuePrivately } from '../onboarding/private-onboarding';
import {
  PERSONAL_REMINDER_KINDS,
  PersonalReminderRepository,
  type PersonalReminder,
  type PersonalReminderKind,
} from './personal-reminder-repository';

const LABELS: Record<PersonalReminderKind, string> = {
  medication: 'Medication reminder',
  contraception: 'Contraception reminder',
  supplement: 'Supplement reminder',
  ovulationTest: 'Ovulation-test reminder',
  pregnancyTest: 'Pregnancy-test reminder',
  custom: 'Custom reminder',
};

function time(value: PersonalReminder): string {
  return `${String(value.hour).padStart(2, '0')}:${String(value.minute).padStart(2, '0')}`;
}

export function PersonalReminderPanel() {
  const repositoryRef = useRef<PersonalReminderRepository | null>(null);
  const vaultRef = useRef<VaultService | null>(null);
  const [items, setItems] = useState<PersonalReminder[]>([]);
  const [status, setStatus] = useState('Opening encrypted reminder store…');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  const refresh = async (repository: PersonalReminderRepository) => setItems(await repository.list());

  useEffect(() => {
    let cancelled = false;
    const vault = new VaultService(new DexieVaultPersistence());
    vaultRef.current = vault;
    void (async () => {
      await continuePrivately(vault);
      const repository = new PersonalReminderRepository(vault);
      if (cancelled) return;
      repositoryRef.current = repository;
      await refresh(repository);
      setStatus('Encrypted personal reminders ready');
      setReady(true);
    })().catch(() => {
      if (cancelled) return;
      setError('Sreva could not open the encrypted personal reminder store.');
      setStatus('Personal reminder store unavailable');
      setReady(true);
    });
    return () => {
      cancelled = true;
      repositoryRef.current = null;
      vaultRef.current = null;
      vault.lock();
    };
  }, []);

  const create = async (form: HTMLFormElement) => {
    const repository = repositoryRef.current;
    if (!repository) return;
    const data = new FormData(form);
    const [hour, minute] = String(data.get('time') || '08:00').split(':').map(Number);
    const kind = String(data.get('kind')) as PersonalReminderKind;
    const label = String(data.get('label') ?? '').trim();
    const date = String(data.get('date') ?? '').trim();
    const snoozeMinutes = Number(data.get('snooze') ?? 10);

    if (!label) {
      setError('Give the reminder a private label.');
      return;
    }

    const reminder: PersonalReminder = {
      id: crypto.randomUUID(),
      kind,
      label,
      hour,
      minute,
      ...(date ? { date } : {}),
      enabled: true,
      snoozeMinutes,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      createdAt: new Date().toISOString(),
    };

    setError('');
    try {
      await repository.save(reminder);
      await refresh(repository);
      form.reset();
      setStatus('Personal reminder saved locally · encrypted');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sreva could not save the personal reminder.');
    }
  };

  const changeEnabled = async (item: PersonalReminder, enabled: boolean) => {
    const repository = repositoryRef.current;
    if (!repository) return;
    await repository.save({ ...item, enabled });
    await refresh(repository);
  };

  const snooze = async (item: PersonalReminder) => {
    const repository = repositoryRef.current;
    if (!repository) return;
    await repository.snooze(item.id);
    await refresh(repository);
    setStatus(`Snoozed for ${item.snoozeMinutes} minutes`);
  };

  const remove = async (id: string) => {
    const repository = repositoryRef.current;
    if (!repository) return;
    await repository.delete(id);
    await refresh(repository);
    setStatus('Personal reminder deleted');
  };

  return (
    <div className="core-panel-grid" data-testid="personal-reminders" aria-busy={!ready}>
      <Card eyebrow="Personal reminder manager" title="Medication, tests & custom reminders">
        <div className="account-free-core__status">
          <StatusChip tone={error ? 'danger' : ready ? 'success' : 'info'}>{status}</StatusChip>
        </div>
        {error ? <p className="core-error" role="alert">{error}</p> : null}
        {ready ? (
          <form className="structured-observation__form" onSubmit={(event) => { event.preventDefault(); void create(event.currentTarget); }}>
            <label><span>Reminder type</span><select name="kind" defaultValue="medication">
              {PERSONAL_REMINDER_KINDS.map((kind) => <option value={kind} key={kind}>{LABELS[kind]}</option>)}
            </select></label>
            <label><span>Private label</span><input name="label" maxLength={120} required /></label>
            <div className="structured-observation__row">
              <label><span>Date (optional; empty repeats daily)</span><input name="date" type="date" /></label>
              <label><span>Time</span><input name="time" type="time" defaultValue="08:00" required /></label>
            </div>
            <label><span>Snooze</span><select name="snooze" defaultValue="10">
              <option value="5">5 minutes</option><option value="10">10 minutes</option>
              <option value="30">30 minutes</option><option value="60">60 minutes</option>
            </select></label>
            <Button type="submit">Save personal reminder</Button>
            <p className="workspace-note">The intent is stored locally with its wall-clock time and time zone. Browser/PWA delivery uses the strongest currently available reviewed mechanism; closed-app delivery is not promised without a reviewed push relay.</p>
          </form>
        ) : null}
      </Card>

      <Card eyebrow="Saved locally" title={items.length ? 'Your personal reminders' : 'No personal reminders yet'}>
        {items.length ? <ul className="structured-observation__records">
          {items.map((item) => (
            <li key={item.id}>
              <header><strong>{item.label}</strong><span>{LABELS[item.kind]}</span></header>
              <p className="structured-observation__meta">{item.date ? item.date + ' · ' : 'Daily · '}{time(item)} · {item.timeZone}</p>
              {item.snoozedUntil ? <p>Snoozed until {new Date(item.snoozedUntil).toLocaleString()}.</p> : null}
              <div className="continuity-actions">
                <Button variant="secondary" onClick={() => { void changeEnabled(item, !item.enabled); }}>{item.enabled ? 'Pause' : 'Enable'}</Button>
                <Button variant="secondary" onClick={() => { void snooze(item); }}>Snooze</Button>
                <Button variant="quiet" onClick={() => { void remove(item.id); }}>Delete</Button>
              </div>
            </li>
          ))}
        </ul> : <p>Create medication, contraception, supplement, ovulation-test, pregnancy-test or custom reminder intents here.</p>}
      </Card>
    </div>
  );
}
