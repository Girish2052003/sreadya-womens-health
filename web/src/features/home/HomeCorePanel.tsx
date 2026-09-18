import Link from 'next/link';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import type { HealthObservation, PeriodEpisode } from '../../domain/cycle/types';
import type { PredictionResult } from '../../domain/prediction/types';
import { formatUtcDate, observationLabel, titleCase } from '../core/presentation';

function predictionDate(value: string): string {
  return formatUtcDate(`${value}T00:00:00.000Z`);
}

export function HomeCorePanel({
  periods,
  observations,
  prediction,
  onStartPeriodToday,
}: {
  periods: PeriodEpisode[];
  observations: HealthObservation[];
  prediction: PredictionResult | null;
  onStartPeriodToday: () => void;
}) {
  const latestPeriod = periods.at(-1);
  const latestObservation = observations.at(-1);

  return (
    <div className="core-panel-grid">
      <Card eyebrow="Private local summary" title="Your Sreadya today">
        <p>
          {periods.length} recorded period{periods.length === 1 ? '' : 's'} · {observations.length} local observation{observations.length === 1 ? '' : 's'}
        </p>
        <div className="core-actions">
          <Button onClick={onStartPeriodToday}>Period started today</Button>
          <Link className="link-button link-button--quiet" href="/app/log">Log how you feel</Link>
        </div>
      </Card>

      <Card eyebrow="Cycle history" title={latestPeriod ? `Latest period · ${formatUtcDate(latestPeriod.start)}` : 'No period history yet'}>
        <p>{latestPeriod?.end ? `Ended ${formatUtcDate(latestPeriod.end)}.` : latestPeriod ? 'Currently marked as ongoing.' : 'Start when it is useful to you. Sreadya never assumes a 28-day cycle.'}</p>
        <Link className="workspace-text-link" href="/app/cycle">Open cycle history</Link>
      </Card>

      <Card eyebrow="Recent context" title={latestObservation ? observationLabel(latestObservation.kind) : 'Nothing logged yet'}>
        <p>{latestObservation?.note ?? 'Your optional daily observations will appear here after you save them.'}</p>
        <Link className="workspace-text-link" href="/app/today">See today</Link>
      </Card>

      <Card eyebrow="Local intelligence" title={prediction ? `Most likely · ${predictionDate(prediction.mostLikelyDate)}` : 'More cycle history needed'}>
        {prediction ? (
          <>
            <p>{predictionDate(prediction.windowStart)} – {predictionDate(prediction.windowEnd)}</p>
            <p>{titleCase(prediction.confidence)} confidence · based on {prediction.validIntervals.length} recent valid cycle intervals.</p>
          </>
        ) : (
          <p>Sreadya will calculate an estimate locally after enough valid cycle history is available.</p>
        )}
        <Link className="workspace-text-link" href="/app/predictions">Open predictions</Link>
      </Card>
    </div>
  );
}
