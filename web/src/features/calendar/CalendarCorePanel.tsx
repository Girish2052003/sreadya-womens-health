'use client';

import { Card } from '../../components/ui/Card';
import type { PeriodEpisode } from '../../domain/cycle/types';
import { formatLocaleDate, isEnglishLocale } from '../../i18n/locale';
import { useI18n } from '../../i18n/I18nProvider';
import { formatUtcDate, periodDurationDays } from '../core/presentation';
import type { YearHistoryGroup } from './calendar-history';

export type CalendarMode = 'month' | 'timeline' | 'year';

function PeriodList({ periods }: { periods: PeriodEpisode[] }) {
  const { t, locale } = useI18n();
  const date = (value: string) => isEnglishLocale(locale) ? formatUtcDate(value) : formatLocaleDate(value, locale, 'UTC');
  if (periods.length === 0) return <p>{t('calendar.noPeriod')}</p>;
  return (
    <ul className="core-record-list">
      {periods.map((period) => {
        const duration = periodDurationDays(period);
        return <li key={period.id}><strong>{date(period.start)}</strong><span>{period.end ? t('calendar.periodEnded', { days: duration ?? 0, date: date(period.end) }) : t('calendar.ongoing')}</span></li>;
      })}
    </ul>
  );
}

export function CalendarCorePanel({ mode, periods, yearGroups, selectedYear, selectedMonth, onModeChange, onMonthChange }: {
  mode: CalendarMode; periods: PeriodEpisode[]; yearGroups: YearHistoryGroup[]; selectedYear: number; selectedMonth: number;
  onModeChange: (mode: CalendarMode) => void; onMonthChange: (year: number, month: number) => void;
}) {
  const { t } = useI18n();
  const monthValue = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const modeLabels = { month: t('calendar.month'), timeline: t('calendar.timeline'), year: t('calendar.year') };

  return (
    <div className="core-panel-grid">
      <Card eyebrow={t('calendar.eyebrow.history')} title={t('calendar.title')}>
        <div className="core-mode-tabs" role="group" aria-label={t('calendar.viewAria')}>
          {(['month', 'timeline', 'year'] as const).map((value) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => onModeChange(value)}>{modeLabels[value]}</button>)}
        </div>
      </Card>
      {mode === 'month' ? <Card eyebrow={t('calendar.month')} title={t('calendar.monthTitle')}><label className="core-field" htmlFor="calendar-month"><span>{t('calendar.chooseMonth')}</span><input id="calendar-month" type="month" value={monthValue} onChange={(event) => { const [year, month] = event.currentTarget.value.split('-').map(Number); if (Number.isInteger(year) && Number.isInteger(month)) onMonthChange(year, month); }} /></label><PeriodList periods={periods} /></Card> : null}
      {mode === 'timeline' ? <Card eyebrow={t('calendar.timeline')} title={t('calendar.timelineTitle')}><PeriodList periods={periods} /></Card> : null}
      {mode === 'year' ? <Card eyebrow={t('calendar.year')} title={t('calendar.yearTitle')}>{yearGroups.length === 0 ? <p>{t('calendar.noYear')}</p> : yearGroups.map((group) => <section key={group.year} className="core-year-group" aria-labelledby={`year-${group.year}`}><h3 id={`year-${group.year}`}>{t('calendar.yearCount', { year: group.year, count: group.periods.length })}</h3><PeriodList periods={group.periods} /></section>)}</Card> : null}
    </div>
  );
}
