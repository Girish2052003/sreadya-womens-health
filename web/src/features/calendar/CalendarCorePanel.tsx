'use client';

import { Card } from '../../components/ui/Card';
import type { PeriodEpisode } from '../../domain/cycle/types';
import { formatUtcDate, periodDurationDays } from '../core/presentation';
import type { YearHistoryGroup } from './calendar-history';

export type CalendarMode = 'month' | 'timeline' | 'year';

function PeriodList({ periods }: { periods: PeriodEpisode[] }) {
  if (periods.length === 0) return <p>No period history in this view yet.</p>;
  return (
    <ul className="core-record-list">
      {periods.map((period) => {
        const duration = periodDurationDays(period);
        return (
          <li key={period.id}>
            <strong>{formatUtcDate(period.start)}</strong>
            <span>{period.end ? `${duration ?? 0} recorded period days · ended ${formatUtcDate(period.end)}` : 'Ongoing'}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function CalendarCorePanel({
  mode,
  periods,
  yearGroups,
  selectedYear,
  selectedMonth,
  onModeChange,
  onMonthChange,
}: {
  mode: CalendarMode;
  periods: PeriodEpisode[];
  yearGroups: YearHistoryGroup[];
  selectedYear: number;
  selectedMonth: number;
  onModeChange: (mode: CalendarMode) => void;
  onMonthChange: (year: number, month: number) => void;
}) {
  const monthValue = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  return (
    <div className="core-panel-grid">
      <Card eyebrow="Cycle history" title="Calendar & history">
        <div className="core-mode-tabs" role="group" aria-label="Calendar history view">
          {(['month', 'timeline', 'year'] as const).map((value) => (
            <button key={value} type="button" aria-pressed={mode === value} onClick={() => onModeChange(value)}>
              {value === 'month' ? 'Month' : value === 'timeline' ? 'Timeline' : 'Year'}
            </button>
          ))}
        </div>
      </Card>

      {mode === 'month' ? (
        <Card eyebrow="Month" title="Periods starting in this month">
          <label className="core-field" htmlFor="calendar-month">
            <span>Choose month</span>
            <input
              id="calendar-month"
              type="month"
              value={monthValue}
              onChange={(event) => {
                const [year, month] = event.currentTarget.value.split('-').map(Number);
                if (Number.isInteger(year) && Number.isInteger(month)) onMonthChange(year, month);
              }}
            />
          </label>
          <PeriodList periods={periods} />
        </Card>
      ) : null}

      {mode === 'timeline' ? (
        <Card eyebrow="Timeline" title="Period-day timeline"><PeriodList periods={periods} /></Card>
      ) : null}

      {mode === 'year' ? (
        <Card eyebrow="Year" title="Yearly history">
          {yearGroups.length === 0 ? <p>No yearly history yet.</p> : yearGroups.map((group) => (
            <section key={group.year} className="core-year-group" aria-labelledby={`year-${group.year}`}>
              <h3 id={`year-${group.year}`}>{group.year} · {group.periods.length} recorded period{group.periods.length === 1 ? '' : 's'}</h3>
              <PeriodList periods={group.periods} />
            </section>
          ))}
        </Card>
      ) : null}
    </div>
  );
}
