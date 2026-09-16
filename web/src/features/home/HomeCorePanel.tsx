import type { HealthObservation, PeriodEpisode } from '../../domain/cycle/types';

export function HomeCorePanel({
  periods,
  observations,
  onStartPeriodToday,
}: {
  periods: PeriodEpisode[];
  observations: HealthObservation[];
  onStartPeriodToday: () => void;
}) {
  void periods;
  void observations;
  void onStartPeriodToday;
  return <div>Task 10 Home panel not implemented.</div>;
}
