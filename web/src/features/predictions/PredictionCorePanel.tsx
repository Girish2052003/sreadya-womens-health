import { Card } from '../../components/ui/Card';
import type { PredictionEvaluation } from '../../domain/prediction/prediction-history';
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

function addDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function PredictionCorePanel({
  prediction,
  historyCount = 0,
  evaluation,
  fertilityEstimatesEnabled = false,
}: {
  prediction: PredictionResult | null;
  historyCount?: number;
  evaluation?: PredictionEvaluation;
  fertilityEstimatesEnabled?: boolean;
}) {
  if (!prediction) {
    return (
      <div className="core-panel-grid" data-testid="prediction-core-panel">
        <Card eyebrow="Local estimate" title="Prediction">
          <p>More cycle history is needed before Sreadya can calculate a meaningful estimate.</p>
          <p className="workspace-note">
            No date is invented. Record at least two period starts; Sreadya will use your own history and will not assume a 28-day cycle.
          </p>
        </Card>
        <Card eyebrow="Prediction history" title="Accuracy starts with real outcomes">
          <p>Prediction history: {historyCount} local generation{historyCount === 1 ? '' : 's'} recorded.</p>
          <p>No accuracy score is invented before a later period start can be compared with an earlier prediction.</p>
        </Card>
      </div>
    );
  }

  const confidence = displayConfidence(prediction.confidence);
  const pmsStart = addDays(prediction.mostLikelyDate, -7);
  const pmsEnd = addDays(prediction.mostLikelyDate, -1);
  const ovulation = addDays(prediction.mostLikelyDate, -14);
  const fertileStart = addDays(ovulation, -5);
  const fertileEnd = addDays(ovulation, 1);

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
          This is an estimate, not a guarantee or diagnosis. It is not contraceptive guidance.
        </p>
      </Card>

      <Card eyebrow="How Sreadya calculated this" title="Your history stays in context">
        <p>Estimated cycle length: {prediction.estimatedCycleLengthDays} days.</p>
        <p>
          {prediction.estimatedPeriodDurationDays == null
            ? 'Period-duration history is not sufficient for a duration estimate yet.'
            : `Estimated period duration: ${prediction.estimatedPeriodDurationDays} days.`}
        </p>
        <p>Recent variability (MAD): {prediction.medianAbsoluteDeviation} days.</p>
        <p>Algorithm version: <strong>{prediction.algorithmVersion}</strong>.</p>
        {prediction.excludedIntervals.length > 0 ? (
          <p className="workspace-note">
            {prediction.excludedIntervals.length} implausible interval{prediction.excludedIntervals.length === 1 ? ' was' : 's were'} excluded by the frozen Prediction v1 contract.
          </p>
        ) : null}
      </Card>

      <Card eyebrow="Cycle context" title="PMS estimate">
        <p>{displayDate(pmsStart)} – {displayDate(pmsEnd)}</p>
        <p className="workspace-note">
          This is a transparent seven-day pre-period planning window derived from the current period estimate. It is not a diagnosis of PMS and does not claim symptoms will occur.
        </p>
      </Card>

      <Card eyebrow="Trying to conceive context" title="Fertility estimates">
        {fertilityEstimatesEnabled ? (
          <>
            <p>Ovulation estimate: <strong>{displayDate(ovulation)}</strong></p>
            <p>Estimated fertile window: <strong>{displayDate(fertileStart)} – {displayDate(fertileEnd)}</strong></p>
            <p className="workspace-note">
              These are optional calendar estimates for Trying to Conceive mode. They use the conventional next-period-minus-14-day heuristic and are not contraceptive guidance, clinical fertility confirmation, or a guarantee of ovulation.
            </p>
          </>
        ) : (
          <>
            <p>Ovulation estimate: available only when Trying to Conceive mode is enabled.</p>
            <p>Estimated fertile window: available only when Trying to Conceive mode is enabled.</p>
            <p className="workspace-note">Sreadya does not silently show fertility timing in other life-stage modes.</p>
          </>
        )}
      </Card>

      <Card eyebrow="Prediction history" title="Local accuracy record">
        <p>Prediction history: <strong>{historyCount}</strong> local generation{historyCount === 1 ? '' : 's'} recorded.</p>
        {evaluation && evaluation.sampleCount > 0 ? (
          <>
            <p>Evaluated outcomes: <strong>{evaluation.sampleCount}</strong></p>
            <p>Mean absolute error: <strong>{evaluation.meanAbsoluteErrorDays.toFixed(1)} days</strong></p>
            <p>Prediction-window coverage: <strong>{Math.round(evaluation.windowCoverage * 100)}%</strong></p>
          </>
        ) : (
          <p>No accuracy score is shown until a later actual period start can be compared with a previously stored prediction.</p>
        )}
        <p className="workspace-note">Prediction history and outcome evaluation stay in the encrypted local vault.</p>
      </Card>
    </div>
  );
}
