'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusChip } from '../../components/ui/StatusChip';
import type { FlowLevel, HealthObservation, ObservationKind, Severity } from '../../domain/cycle/types';
import { DexieVaultPersistence } from '../../vault/db';
import { HealthVaultRepository } from '../../vault/health-repository';
import { VaultService } from '../../vault/vault-service';
import { ObservationActions } from '../cycle/observation-actions';
import { continuePrivately } from '../onboarding/private-onboarding';

type Config = {
  eyebrow: string;
  title: string;
  summary: string;
  kinds: readonly ObservationKind[];
};

const FLOW_LEVELS: FlowLevel[] = ['spotting', 'light', 'medium', 'heavy'];
const SEVERITIES: Severity[] = ['mild', 'moderate', 'severe'];

function label(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

function localDateTimeValue(date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formattedDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function StructuredObservationWorkspace({ config }: { config: Config }) {
  const vaultRef = useRef<VaultService | null>(null);
  const repositoryRef = useRef<HealthVaultRepository | null>(null);
  const [items, setItems] = useState<HealthObservation[]>([]);
  const [selectedKind, setSelectedKind] = useState<ObservationKind>(config.kinds[0]);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Opening encrypted local vault…');
  const [error, setError] = useState('');

  const allowed = useMemo(() => new Set(config.kinds), [config.kinds]);

  const refresh = async (repository: HealthVaultRepository) => {
    const all = await repository.listObservations();
    setItems(all.filter((item) => allowed.has(item.kind)).reverse());
  };

  useEffect(() => {
    let cancelled = false;
    const vault = new VaultService(new DexieVaultPersistence());
    vaultRef.current = vault;
    void (async () => {
      await continuePrivately(vault);
      const repository = new HealthVaultRepository(vault);
      if (cancelled) return;
      repositoryRef.current = repository;
      await refresh(repository);
      setStatus('Encrypted local vault ready');
      setReady(true);
    })().catch(() => {
      if (cancelled) return;
      setError('Sreadya could not open this encrypted local workspace.');
      setStatus('Local vault unavailable');
      setReady(true);
    });
    return () => {
      cancelled = true;
      repositoryRef.current = null;
      vaultRef.current = null;
      vault.lock();
    };
  }, [allowed]);

  const save = async (form: HTMLFormElement) => {
    const repository = repositoryRef.current;
    if (!repository) return;
    const data = new FormData(form);
    const occurredAtRaw = String(data.get('occurred-at') ?? '');
    const occurredAtDate = new Date(occurredAtRaw);
    if (!Number.isFinite(occurredAtDate.getTime())) {
      setError('Choose a valid date and time.');
      return;
    }

    const severityRaw = String(data.get('severity') ?? '');
    const numericRaw = String(data.get('numeric-value') ?? '').trim();
    const unit = String(data.get('unit') ?? '').trim();
    const observationLabel = String(data.get('label') ?? '').trim();
    const note = String(data.get('note') ?? '').trim();
    const flowRaw = String(data.get('flow-level') ?? '');

    const draft: Omit<HealthObservation, 'id' | 'source'> = {
      kind: selectedKind,
      occurredAt: occurredAtDate.toISOString(),
      ...(SEVERITIES.includes(severityRaw as Severity) ? { severity: severityRaw as Severity } : {}),
      ...(numericRaw.length > 0 && Number.isFinite(Number(numericRaw)) ? { numericValue: Number(numericRaw) } : {}),
      ...(unit ? { unit } : {}),
      ...(observationLabel ? { label: observationLabel } : {}),
      ...(note ? { note } : {}),
      ...(selectedKind === 'menstrualFlow' && FLOW_LEVELS.includes(flowRaw as FlowLevel)
        ? { flowLevel: flowRaw as FlowLevel }
        : {}),
    };

    setError('');
    try {
      await new ObservationActions(repository).logObservation(draft);
      await refresh(repository);
      form.reset();
      setSelectedKind(config.kinds[0]);
      setStatus('Saved locally · encrypted');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sreadya could not save this local observation.');
    }
  };

  const remove = async (id: string) => {
    const repository = repositoryRef.current;
    if (!repository) return;
    setError('');
    try {
      await new ObservationActions(repository).deleteObservation(id);
      await refresh(repository);
      setStatus('Record deleted locally');
    } catch {
      setError('Sreadya could not delete that local record.');
    }
  };

  return (
    <section className="account-free-core" aria-busy={!ready}>
      <div className="account-free-core__status">
        <StatusChip tone={error ? 'danger' : ready ? 'success' : 'info'}>{status}</StatusChip>
        <span className="workspace-note">Account-free · encrypted local health record · no health telemetry</span>
      </div>
      {error ? <p className="core-error" role="alert">{error}</p> : null}

      {ready ? (
        <div className="workspace-grid">
          <Card eyebrow={config.eyebrow} title={config.title}>
            <p>{config.summary}</p>
            <form
              className="structured-observation__form"
              onSubmit={(event) => {
                event.preventDefault();
                void save(event.currentTarget);
              }}
            >
              <label>
                <span>What are you recording?</span>
                <select name="kind" value={selectedKind} onChange={(event) => setSelectedKind(event.currentTarget.value as ObservationKind)}>
                  {config.kinds.map((kind) => <option value={kind} key={kind}>{label(kind)}</option>)}
                </select>
              </label>

              <div className="structured-observation__row">
                <label>
                  <span>Date and time</span>
                  <input name="occurred-at" type="datetime-local" required defaultValue={localDateTimeValue()} />
                </label>
                <label>
                  <span>Severity (optional)</span>
                  <select name="severity" defaultValue="">
                    <option value="">Not specified</option>
                    {SEVERITIES.map((severity) => <option value={severity} key={severity}>{label(severity)}</option>)}
                  </select>
                </label>
              </div>

              {selectedKind === 'menstrualFlow' ? (
                <label>
                  <span>Flow level</span>
                  <select name="flow-level" defaultValue="medium">
                    {FLOW_LEVELS.map((flow) => <option value={flow} key={flow}>{label(flow)}</option>)}
                  </select>
                </label>
              ) : null}

              <div className="structured-observation__row">
                <label>
                  <span>Value (optional)</span>
                  <input name="numeric-value" type="number" step="any" inputMode="decimal" />
                </label>
                <label>
                  <span>Unit (optional)</span>
                  <input name="unit" type="text" maxLength={32} placeholder="°C, kg, hours, ml…" />
                </label>
              </div>

              <label>
                <span>Label / result / medicine name (optional)</span>
                <input name="label" type="text" maxLength={120} />
              </label>
              <label>
                <span>Private note (optional)</span>
                <textarea name="note" rows={3} maxLength={2000} />
              </label>
              <Button type="submit">Save encrypted record</Button>
            </form>
          </Card>

          <Card eyebrow="Local history" title={items.length ? 'Your recent records' : 'No records here yet'}>
            {items.length === 0 ? <p>Nothing has been recorded in this category yet.</p> : (
              <ul className="structured-observation__records">
                {items.slice(0, 30).map((item) => (
                  <li key={item.id}>
                    <header>
                      <strong>{item.label ?? label(item.kind)}</strong>
                      <Button variant="quiet" aria-label={'Delete ' + label(item.kind)} onClick={() => { void remove(item.id); }}>Delete</Button>
                    </header>
                    <p className="structured-observation__meta">{formattedDate(item.occurredAt)}
                      {item.severity ? ' · ' + label(item.severity) : ''}
                      {item.flowLevel ? ' · ' + label(item.flowLevel) : ''}
                      {item.numericValue !== undefined ? ' · ' + item.numericValue + (item.unit ? ' ' + item.unit : '') : ''}
                    </p>
                    {item.note ? <p>{item.note}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : null}
    </section>
  );
}
