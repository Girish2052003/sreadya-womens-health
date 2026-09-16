import type { PeriodEpisode } from '../../domain/cycle/types';
import type { YearHistoryGroup } from './calendar-history';

export type CalendarMode = 'month' | 'timeline' | 'year';

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
  void mode;
  void periods;
  void yearGroups;
  void selectedYear;
  void selectedMonth;
  void onModeChange;
  void onMonthChange;
  return <div>Task 10 Calendar panel not implemented.</div>;
}
