'use client';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { OBSERVATION_KINDS, type HealthObservation } from '../../domain/cycle/types';
import { useI18n } from '../../i18n/I18nProvider';
import { observationLabel, titleCase } from '../core/presentation';

export function LogCorePanel({ observations, onLog, onDelete }: {
  observations: HealthObservation[]; onLog: (kind: HealthObservation['kind'], note?: string) => void; onDelete: (id: string) => void;
}) {
  const { t } = useI18n();
  const recent = observations.slice(-12).reverse();
  const observationName = (kind: HealthObservation['kind']) => t(`observation.kind.${kind}`, {}, observationLabel(kind));
  return (
    <div className="core-panel-grid">
      <Card eyebrow={t('log.eyebrow')} title={t('log.title')}>
        <p>{t('log.summary')}</p>
        <form className="core-form" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const kind = data.get('observation-kind') as HealthObservation['kind']; const rawNote = String(data.get('observation-note') ?? '').trim(); onLog(kind, rawNote.length > 0 ? rawNote : undefined); event.currentTarget.reset(); }}>
          <label htmlFor="observation-kind">{t('log.what')}</label>
          <select id="observation-kind" name="observation-kind" defaultValue="cramps">{OBSERVATION_KINDS.map((kind) => <option key={kind} value={kind}>{observationName(kind)}</option>)}</select>
          <label htmlFor="observation-note">{t('log.note')}</label>
          <textarea id="observation-note" name="observation-note" rows={3} placeholder={t('log.notePlaceholder')} />
          <Button type="submit">{t('log.save')}</Button>
        </form>
      </Card>
      <Card eyebrow={t('log.recentEyebrow')} title={recent.length === 0 ? t('homeCore.nothingLogged') : t('log.latest')}>
        {recent.length === 0 ? <p>{t('log.none')}</p> : <ul className="core-record-list">{recent.map((item) => <li key={item.id}><div><strong>{item.label ?? observationName(item.kind)}</strong>{item.severity ? <span>{t(`observation.severity.${item.severity}`, {}, titleCase(item.severity))}</span> : null}{item.note ? <p>{item.note}</p> : null}</div><Button variant="quiet" aria-label={t('log.deleteAria', { item: observationName(item.kind) })} onClick={() => onDelete(item.id)}>{t('common.delete')}</Button></li>)}</ul>}
      </Card>
      <Card eyebrow={t('log.boundaryEyebrow')} title={t('log.boundaryTitle')}><p>{t('log.boundaryBody')}</p></Card>
    </div>
  );
}
