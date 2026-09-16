import type { PeriodEpisode } from '../../domain/cycle/types';
import type { PeriodEdit } from './period-actions';

export function CycleCorePanel({
  periods,
  onStartPeriodToday,
  onEndPeriod,
  onEditPeriod,
  onDeletePeriod,
}: {
  periods: PeriodEpisode[];
  onStartPeriodToday: () => void;
  onEndPeriod: (id: string) => void;
  onEditPeriod: (id: string, edit: PeriodEdit) => void;
  onDeletePeriod: (id: string) => void;
}) {
  void periods;
  void onStartPeriodToday;
  void onEndPeriod;
  void onEditPeriod;
  void onDeletePeriod;
  return <div>Task 10 Cycle panel not implemented.</div>;
}
