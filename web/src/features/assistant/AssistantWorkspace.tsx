'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusChip } from '../../components/ui/StatusChip';
import { DexieVaultPersistence } from '../../vault/db';
import { HealthVaultRepository } from '../../vault/health-repository';
import { VaultService } from '../../vault/vault-service';
import { ObservationActions } from '../cycle/observation-actions';
import { PersonalReminderRepository } from '../reminders/personal-reminder-repository';
import { PeriodActions } from '../cycle/period-actions';
import { continuePrivately } from '../onboarding/private-onboarding';
import { predictFromRepository } from '../predictions/prediction-service';
import { parseLocalIntent, type ParsedCommand } from './local-intent-parser';

function utcMidnight(dateKey: string): string {
  return `${dateKey}T00:00:00.000Z`;
}

function displayDate(dateKey: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${dateKey}T00:00:00.000Z`));
}

export function AssistantWorkspace() {
  const repositoryRef = useRef<HealthVaultRepository | null>(null);
  const reminderRepositoryRef = useRef<PersonalReminderRepository | null>(null);
  const [text, setText] = useState('');
  const [command, setCommand] = useState<ParsedCommand | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Opening encrypted local vault…');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const vault = new VaultService(new DexieVaultPersistence());
    void (async () => {
      await continuePrivately(vault);
      if (cancelled) return;
      repositoryRef.current = new HealthVaultRepository(vault);
      reminderRepositoryRef.current = new PersonalReminderRepository(vault);
      setStatus('Encrypted local vault ready');
      setReady(true);
    })().catch(() => {
      if (cancelled) return;
      setStatus('Local vault unavailable');
      setError('Sreadya could not open the encrypted local workspace for the private assistant.');
      setReady(true);
    });
    return () => {
      cancelled = true;
      repositoryRef.current = null;
      reminderRepositoryRef.current = null;
      vault.lock();
    };
  }, []);

  const interpret = async () => {
    const repository = repositoryRef.current;
    if (!repository || text.trim().length === 0) return;
    setError('');
    const parsed = parseLocalIntent(text, new Date());
    setCommand(parsed);
    setAnswer(null);

    if (parsed.intent === 'nextPeriodQuery') {
      const prediction = await predictFromRepository(repository, new Date().toISOString());
      setAnswer(prediction === null
        ? 'I need at least two valid period starts before I can estimate the next period. No date is invented.'
        : `Most likely ${displayDate(prediction.mostLikelyDate)}, with an expected window of ${displayDate(prediction.windowStart)}–${displayDate(prediction.windowEnd)} (${prediction.confidence} confidence).`);
    } else if (parsed.intent === 'historyQuery') {
      const periods = await repository.listPeriods();
      const recent = periods.slice(-6).reverse();
      setAnswer(recent.length === 0
        ? 'No period history is stored yet.'
        : recent.map((period) => displayDate(period.start.slice(0, 10))).join(' · '));
    } else if (parsed.intent === 'searchHistory') {
      const query = (parsed.value ?? '').toLowerCase();
      const observations = await repository.listObservations();
      const matches = observations.filter((item) =>
        item.kind.toLowerCase().includes(query)
        || item.label?.toLowerCase().includes(query)
        || item.note?.toLowerCase().includes(query)
      ).slice(-10).reverse();
      setAnswer(matches.length === 0
        ? `No local observation matched “${parsed.value ?? ''}”.`
        : matches.map((item) => `${displayDate(item.occurredAt.slice(0, 10))}: ${item.label ?? item.kind}`).join(' · '));
    } else if (parsed.intent === 'addReminder') {
      setAnswer('The reminder was parsed locally. Review the type, label and time, then confirm to save it in the encrypted personal reminder store.');
    } else if (parsed.intent === 'unknown') {
      setAnswer('I could not safely turn that into a local health action. Nothing was saved.');
    }
  };

  const confirm = async () => {
    const repository = repositoryRef.current;
    if (!repository || !command) return;
    setError('');
    try {
      if (command.intent === 'periodStarted' && command.date) {
        await new PeriodActions(repository).startPeriod(utcMidnight(command.date));
      } else if (command.intent === 'periodEnded' && command.date) {
        const open = (await repository.listPeriods()).filter((period) => period.end == null).at(-1);
        if (!open) throw new Error('There is no ongoing period to end.');
        await new PeriodActions(repository).endPeriod(open.id, utcMidnight(command.date));
      } else if ((command.intent === 'logFlow' || command.intent === 'logSymptom') && command.date) {
        await new ObservationActions(repository).logObservation({
          kind: command.observationKind ?? 'custom',
          occurredAt: utcMidnight(command.date),
          ...(command.severity ? { severity: command.severity } : {}),
          ...(command.flowLevel ? { flowLevel: command.flowLevel } : {}),
          ...(command.label ? { label: command.label } : {}),
          ...(command.note ? { note: command.note } : {}),
        });
      } else if (command.intent === 'addReminder') {
        const reminders = reminderRepositoryRef.current;
        if (!reminders) throw new Error('The encrypted personal reminder store is unavailable.');
        if (command.reminderHour === undefined) throw new Error('Add a reminder time, for example “at 8”.');
        const kind = command.reminderKind ?? 'medication';
        await reminders.save({
          id: crypto.randomUUID(),
          kind,
          label: command.label ?? 'Health reminder',
          hour: command.reminderHour,
          minute: command.reminderMinute ?? 0,
          enabled: true,
          snoozeMinutes: 10,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          createdAt: new Date().toISOString(),
        });
      } else if (command.intent === 'unknown') {
        throw new Error('That command could not be converted safely. Nothing was saved.');
      } else {
        return;
      }

      setStatus('Saved locally · encrypted');
      setText('');
      setCommand(null);
      setAnswer(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The local assistant action could not be saved.');
    }
  };

  return (
    <section className="account-free-core" data-testid="assistant-workspace" aria-busy={!ready}>
      <div className="account-free-core__status">
        <StatusChip tone={error ? 'danger' : ready ? 'success' : 'info'}>{status}</StatusChip>
        <span className="workspace-note">Account-free · deterministic local parser · no cloud LLM</span>
      </div>
      {error ? <p className="core-error" role="alert">{error}</p> : null}

      {ready ? (
        <div className="workspace-grid">
          <Card eyebrow="Private assistant" title="Tell Sreadya">
            <p>Try “My period started yesterday”, “Yesterday was heavy”, “I have severe cramps today”, “When is my next period?”, “Show my last six periods”, “Find cramps”, or “Remind me about medicine at 8”.</p>
            <label>
              <span>Private command</span>
              <textarea
                aria-label="Private command"
                rows={4}
                value={text}
                onChange={(event) => { setText(event.target.value); setCommand(null); setAnswer(null); }}
              />
            </label>
            <Button disabled={text.trim().length === 0} onClick={() => { void interpret(); }}>Understand locally</Button>
            <p className="workspace-note">Voice input is not enabled in this Web build because no reviewed private offline-recognition adapter is available. Text reminder creation is available locally.</p>
          </Card>

          <Card eyebrow="Local interpretation" title="Sreadya understood">
            {!command ? <p>No command has been interpreted yet.</p> : (
              <>
                <p>Intent: <strong>{command.intent}</strong></p>
                {command.date ? <p>Date: <strong>{displayDate(command.date)}</strong></p> : null}
                {command.label ? <p>Detail: <strong>{command.label}</strong></p> : null}
                {command.reminderHour !== undefined ? <p>Reminder time: <strong>{String(command.reminderHour).padStart(2, '0')}:{String(command.reminderMinute ?? 0).padStart(2, '0')}</strong></p> : null}
                {answer ? <p data-testid="assistant-answer">{answer}</p> : null}
                {command.requiresConfirmation && command.intent !== 'unknown' ? (
                  <Button onClick={() => { void confirm(); }}>Confirm local action</Button>
                ) : null}
              </>
            )}
          </Card>
        </div>
      ) : null}
    </section>
  );
}
