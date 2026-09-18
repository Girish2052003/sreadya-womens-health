// Product-depth audit anchor: Cycle / period note.
'use client';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import type { HealthObservation, PeriodEpisode } from '../../domain/cycle/types';
import { formatLocaleDate } from '../../i18n/locale';
import { useI18n } from '../../i18n/I18nProvider';
import { formatDateInput, periodDurationDays } from '../core/presentation';
import type { PeriodEdit } from './period-actions';

function dateInputToUtc(value: string): string { return `${value}T00:00:00.000Z`; }

export function CycleCorePanel({ periods, cycleNotes, onStartPeriodToday, onEndPeriod, onEditPeriod, onDeletePeriod, onSaveCycleNote, onDeleteCycleNote }: {
  periods: PeriodEpisode[]; cycleNotes: HealthObservation[]; onStartPeriodToday: () => void; onEndPeriod: (id: string) => void;
  onEditPeriod: (id: string, edit: PeriodEdit) => void; onDeletePeriod: (id: string) => void;
  onSaveCycleNote: (period: PeriodEpisode, note: string) => void; onDeleteCycleNote: (id: string) => void;
}) {
  const { t, locale } = useI18n();
  const recent = [...periods].reverse();
  const date = (value: string) => formatLocaleDate(value, locale, 'UTC');

  return (
    <div className="core-panel-grid">
      <Card eyebrow={t('cycle.eyebrow')} title={t('cycle.title')}><p>{t('cycle.summary')}</p><Button onClick={onStartPeriodToday}>{t('homeCore.periodStarted')}</Button></Card>
      <Card eyebrow={t('cycle.localHistory')} title={recent.length === 0 ? t('homeCore.noPeriod') : t('cycle.recorded')}>
        {recent.length === 0 ? <p>{t('cycle.empty')}</p> : <div className="core-period-list">{recent.map((period) => {
          const duration = periodDurationDays(period); const note = cycleNotes.find((item) => item.label === `cycle-note:${period.id}`);
          return <section key={period.id} className="core-period-card" aria-labelledby={`period-${period.id}`}>
            <div className="core-period-card__summary"><h3 id={`period-${period.id}`}>{date(period.start)}</h3><p>{period.end ? t('cycle.periodEnded', { days: duration ?? 0, date: date(period.end) }) : t('cycle.ongoing')}</p></div>
            <form className="core-date-form" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const start = String(data.get('start')); const end = String(data.get('end') ?? ''); onEditPeriod(period.id, { start: dateInputToUtc(start), end: end.length > 0 ? dateInputToUtc(end) : null }); }}>
              <label><span>{t('cycle.start')}</span><input name="start" type="date" required defaultValue={formatDateInput(period.start)} /></label>
              <label><span>{t('cycle.end')}</span><input name="end" type="date" defaultValue={period.end ? formatDateInput(period.end) : ''} /></label>
              <Button type="submit" variant="secondary">{t('cycle.saveDates')}</Button>
            </form>
            <form className="structured-observation__form" onSubmit={(event) => { event.preventDefault(); const value = String(new FormData(event.currentTarget).get('cycle-note') ?? '').trim(); if (value) onSaveCycleNote(period, value); }}>
              <label><span>{t('cycle.note')}</span><textarea name="cycle-note" rows={2} maxLength={2000} defaultValue={note?.note ?? ''} /></label>
              <div className="core-actions"><Button type="submit" variant="secondary">{t('cycle.saveNote')}</Button>{note ? <Button variant="quiet" onClick={() => onDeleteCycleNote(note.id)}>{t('cycle.deleteNote')}</Button> : null}</div>
            </form>
            <div className="core-actions">{period.end == null ? <Button variant="secondary" onClick={() => onEndPeriod(period.id)}>{t('cycle.markEnded')}</Button> : null}<Button variant="quiet" onClick={() => onDeletePeriod(period.id)}>{t('common.delete')}</Button></div>
          </section>;
        })}</div>}
      </Card>
    </div>
  );
}
