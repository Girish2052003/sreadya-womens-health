import Link from 'next/link';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import type { HealthObservation, PeriodEpisode } from '../../domain/cycle/types';
import { formatUtcDate, observationLabel } from '../core/presentation';

export function HomeCorePanel({
  periods,
  observations,
  onStartPeriodToday,
}: {
  periods: PeriodEpisode[];
  observations: HealthObservation[];
  onStartPeriodToday: () => void;
}) {
  const latestPeriod = periods.at(-1);
  const latestObservation = observations.at(-1);

  return (
    <div className="core-panel-grid">
      <Card eyebrow="Private local summary" title="Your Sreva today">
        <p>
          {periods.length} recorded period{periods.length === 1 ? '' : 's'} · {observations.length} local observation{observations.length === 1 ? '' : 's'}
        </p>
        <div className="core-actions">
          <Button onClick={onStartPeriodToday}>Period started today</Button>
          <Link className="link-button link-button--quiet" href="/app/log">Log how you feel</Link>
        </div>
      </Card>

      <Card eyebrow="Cycle history" title={latestPeriod ? `Latest period · ${formatUtcDate(latestPeriod.start)}` : 'No period history yet'}>
        <p>{latestPeriod?.end ? `Ended ${formatUtcDate(latestPeriod.end)}.` : latestPeriod ? 'Currently marked as ongoing.' : 'Start when it is useful to you. Sreva never assumes a 28-day cycle.'}</p>
        <Link className="workspace-text-link" href="/app/cycle">Open cycle history</Link>
      </Card>

      <Card eyebrow="Recent context" title={latestObservation ? observationLabel(latestObservation.kind) : 'Nothing logged yet'}>
        <p>{latestObservation?.note ?? 'Your optional daily observations will appear here after you save them.'}</p>
        <Link className="workspace-text-link" href="/app/today">See today</Link>
      </Card>

      <Card eyebrow="Local intelligence" title="Predictions stay local">
        <p>Prediction Engine v1 is added in the next governed task. This screen does not invent a date before that shared conformance gate is complete.</p>
      </Card>
    </div>
  );
}
