'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusChip } from '../../components/ui/StatusChip';
import type { FlowLevel, HealthObservation, ObservationKind, Severity } from '../../domain/cycle/types';
import { useI18n } from '../../i18n/I18nProvider';
import { DexieVaultPersistence } from '../../vault/db';
import { HealthVaultRepository } from '../../vault/health-repository';
import { VaultService } from '../../vault/vault-service';
import { ObservationActions } from '../cycle/observation-actions';
import { continuePrivately } from '../onboarding/private-onboarding';

type Config = { eyebrowKey: string; titleKey: string; summaryKey: string; kinds: readonly ObservationKind[] };
const FLOW_LEVELS: FlowLevel[] = ['spotting', 'light', 'medium', 'heavy'];
const SEVERITIES: Severity[] = ['mild', 'moderate', 'severe'];

function fallbackLabel(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[-\s]+/).filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(' ');
}
function localDateTimeValue(date = new Date()): string { const offset = date.getTimezoneOffset() * 60_000; return new Date(date.getTime() - offset).toISOString().slice(0, 16); }

export function StructuredObservationWorkspace({ config }: { config: Config }) {
  const { t, locale } = useI18n();
  const vaultRef = useRef<VaultService | null>(null);
  const repositoryRef = useRef<HealthVaultRepository | null>(null);
  const [items, setItems] = useState<HealthObservation[]>([]);
  const [selectedKind, setSelectedKind] = useState<ObservationKind>(config.kinds[0]);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState(t('core.vault.opening'));
  const [error, setError] = useState('');
  const allowed = useMemo(() => new Set(config.kinds), [config.kinds]);
  const observationName = (kind: ObservationKind) => t(`observation.kind.${kind}`, {}, fallbackLabel(kind));
  const formattedDate = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

  const refresh = async (repository: HealthVaultRepository) => { const all = await repository.listObservations(); setItems(all.filter((item) => allowed.has(item.kind)).reverse()); };

  useEffect(() => {
    let cancelled = false; const vault = new VaultService(new DexieVaultPersistence()); vaultRef.current = vault;
    void (async () => { await continuePrivately(vault); const repository = new HealthVaultRepository(vault); if (cancelled) return; repositoryRef.current = repository; await refresh(repository); setStatus(t('core.vault.ready')); setReady(true); })()
      .catch(() => { if (cancelled) return; setError(t('structured.openError')); setStatus(t('core.vault.unavailable')); setReady(true); });
    return () => { cancelled = true; repositoryRef.current = null; vaultRef.current = null; vault.lock(); };
  }, [allowed, t]);

  const save = async (form: HTMLFormElement) => {
    const repository = repositoryRef.current; if (!repository) return; const data = new FormData(form);
    const occurredAtRaw = String(data.get('occurred-at') ?? ''); const occurredAtDate = new Date(occurredAtRaw);
    if (!Number.isFinite(occurredAtDate.getTime())) { setError(t('structured.invalidDate')); return; }
    const severityRaw = String(data.get('severity') ?? ''); const numericRaw = String(data.get('numeric-value') ?? '').trim();
    const unit = String(data.get('unit') ?? '').trim(); const observationLabel = String(data.get('label') ?? '').trim(); const note = String(data.get('note') ?? '').trim(); const flowRaw = String(data.get('flow-level') ?? '');
    const draft: Omit<HealthObservation, 'id' | 'source'> = { kind: selectedKind, occurredAt: occurredAtDate.toISOString(), ...(SEVERITIES.includes(severityRaw as Severity) ? { severity: severityRaw as Severity } : {}), ...(numericRaw.length > 0 && Number.isFinite(Number(numericRaw)) ? { numericValue: Number(numericRaw) } : {}), ...(unit ? { unit } : {}), ...(observationLabel ? { label: observationLabel } : {}), ...(note ? { note } : {}), ...(selectedKind === 'menstrualFlow' && FLOW_LEVELS.includes(flowRaw as FlowLevel) ? { flowLevel: flowRaw as FlowLevel } : {}) };
    setError('');
    try { await new ObservationActions(repository).logObservation(draft); await refresh(repository); form.reset(); setSelectedKind(config.kinds[0]); setStatus(t('core.saved')); }
    catch (cause) { setError(t('structured.saveError')); }
  };

  const remove = async (id: string) => {
    const repository = repositoryRef.current; if (!repository) return; setError('');
    try { await new ObservationActions(repository).deleteObservation(id); await refresh(repository); setStatus(t('core.deleted')); }
    catch { setError(t('structured.deleteError')); }
  };

  return (
    <section className="account-free-core" aria-busy={!ready}>
      <div className="account-free-core__status"><StatusChip tone={error ? 'danger' : ready ? 'success' : 'info'}>{status}</StatusChip><span className="workspace-note">{t('core.accountFreeStatus')}</span></div>
      {error ? <p className="core-error" role="alert">{error}</p> : null}
      {ready ? <div className="workspace-grid">
        <Card eyebrow={t(config.eyebrowKey)} title={t(config.titleKey)}>
          <p>{t(config.summaryKey)}</p>
          <form className="structured-observation__form" onSubmit={(event) => { event.preventDefault(); void save(event.currentTarget); }}>
            <label><span>{t('structured.what')}</span><select name="kind" value={selectedKind} onChange={(event) => setSelectedKind(event.currentTarget.value as ObservationKind)}>{config.kinds.map((kind) => <option value={kind} key={kind}>{observationName(kind)}</option>)}</select></label>
            <div className="structured-observation__row">
              <label><span>{t('structured.dateTime')}</span><input name="occurred-at" type="datetime-local" required defaultValue={localDateTimeValue()} /></label>
              <label><span>{t('structured.severity')}</span><select name="severity" defaultValue=""><option value="">{t('structured.notSpecified')}</option>{SEVERITIES.map((severity) => <option value={severity} key={severity}>{t(`observation.severity.${severity}`, {}, fallbackLabel(severity))}</option>)}</select></label>
            </div>
            {selectedKind === 'menstrualFlow' ? <label><span>{t('structured.flow')}</span><select name="flow-level" defaultValue="medium">{FLOW_LEVELS.map((flow) => <option value={flow} key={flow}>{t(`observation.flow.${flow}`, {}, fallbackLabel(flow))}</option>)}</select></label> : null}
            <div className="structured-observation__row"><label><span>{t('structured.value')}</span><input name="numeric-value" type="number" step="any" inputMode="decimal" /></label><label><span>{t('structured.unit')}</span><input name="unit" type="text" maxLength={32} placeholder={t('structured.unitPlaceholder')} /></label></div>
            <label><span>{t('structured.label')}</span><input name="label" type="text" maxLength={120} /></label>
            <label><span>{t('structured.note')}</span><textarea name="note" rows={3} maxLength={2000} /></label>
            <Button type="submit">{t('structured.save')}</Button>
          </form>
        </Card>
        <Card eyebrow={t('structured.historyEyebrow')} title={items.length ? t('structured.historyTitle') : t('structured.noneTitle')}>
          {items.length === 0 ? <p>{t('structured.noneBody')}</p> : <ul className="structured-observation__records">{items.slice(0, 30).map((item) => <li key={item.id}><header><strong>{item.label ?? observationName(item.kind)}</strong><Button variant="quiet" aria-label={t('log.deleteAria', { item: observationName(item.kind) })} onClick={() => { void remove(item.id); }}>{t('common.delete')}</Button></header><p className="structured-observation__meta">{formattedDate(item.occurredAt)}{item.severity ? ' · ' + t(`observation.severity.${item.severity}`, {}, fallbackLabel(item.severity)) : ''}{item.flowLevel ? ' · ' + t(`observation.flow.${item.flowLevel}`, {}, fallbackLabel(item.flowLevel)) : ''}{item.numericValue !== undefined ? ' · ' + item.numericValue + (item.unit ? ' ' + item.unit : '') : ''}</p>{item.note ? <p>{item.note}</p> : null}</li>)}</ul>}
        </Card>
      </div> : null}
    </section>
  );
}
