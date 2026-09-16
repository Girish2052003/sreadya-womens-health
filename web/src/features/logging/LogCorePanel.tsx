import type { HealthObservation } from '../../domain/cycle/types';

export function LogCorePanel({
  observations,
  onLog,
  onDelete,
}: {
  observations: HealthObservation[];
  onLog: (kind: HealthObservation['kind'], note?: string) => void;
  onDelete: (id: string) => void;
}) {
  void observations;
  void onLog;
  void onDelete;
  return <div>Task 10 Log panel not implemented.</div>;
}
