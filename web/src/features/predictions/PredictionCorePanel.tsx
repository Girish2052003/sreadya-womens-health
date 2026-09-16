import { Card } from '../../components/ui/Card';
import type { PredictionResult } from './prediction-engine';

function displayDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}

function displayConfidence(value: PredictionResult['confidence']): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

export function PredictionCorePanel({ prediction }: { prediction: PredictionResult | null }) {
  if (!prediction) {
    return (
      <div className="core-panel-grid" data-testid="prediction-core-panel">
        <Card eyebrow="Local estimate" title="Prediction">
          <p>More cycle history is needed before Sreva can calculate a meaningful estimate.</p>
          <p className="workspace-note">
            No date is invented. Record at least two period starts; Sreva will use your own history and will not assume a 28-day cycle.
          </p>
        </Card>
      </div>
    );
  }

  const confidence = displayConfidence(prediction.confidence);

  return (
    <div className="core-panel-grid" data-testid="prediction-core-panel">
      <Card eyebrow="Prediction v1" title="Prediction">
        <dl className="prediction-summary">
          <div>
            <dt>Most likely date</dt>
            <dd>{displayDate(prediction.mostLikelyDate)}</dd>
          </div>
          <div>
            <dt>Expected range</dt>
            <dd>{displayDate(prediction.windowStart)} – {displayDate(prediction.windowEnd)}</dd>
          </div>
          <div>
            <dt>Confidence</dt>
            <dd>{confidence}</dd>
          </div>
        </dl>
        <p>Based on {prediction.validIntervals.length} recent valid cycle intervals.</p>
        <p className="workspace-note">
          This is an estimate, not a guarantee or diagnosis. It must not be used as contraceptive guidance.
        </p>
      </Card>

      <Card eyebrow="How Sreva calculated this" title="Your history stays in context">
        <p>Estimated cycle length: {prediction.estimatedCycleLengthDays} days.</p>
        <p>
          {prediction.estimatedPeriodDurationDays == null
            ? 'Period-duration history is not sufficient for a duration estimate yet.'
            : `Estimated period duration: ${prediction.estimatedPeriodDurationDays} days.`}
        </p>
        <p>Recent variability (MAD): {prediction.medianAbsoluteDeviation} days.</p>
        {prediction.excludedIntervals.length > 0 ? (
          <p className="workspace-note">
            {prediction.excludedIntervals.length} implausible interval{prediction.excludedIntervals.length === 1 ? ' was' : 's were'} excluded by the frozen Prediction v1 contract.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
