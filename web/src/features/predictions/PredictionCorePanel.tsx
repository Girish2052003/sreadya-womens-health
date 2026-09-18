'use client';

import { Card } from '../../components/ui/Card';
import type { PredictionEvaluation } from '../../domain/prediction/prediction-history';
import { formatLocaleDate } from '../../i18n/locale';
import { useI18n } from '../../i18n/I18nProvider';
import type { PredictionResult } from './prediction-engine';

function addDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10);
}

export function PredictionCorePanel({ prediction, historyCount = 0, evaluation, fertilityEstimatesEnabled = false }: {
  prediction: PredictionResult | null; historyCount?: number; evaluation?: PredictionEvaluation; fertilityEstimatesEnabled?: boolean;
}) {
  const { t, locale } = useI18n();
  const displayDate = (value: string) => formatLocaleDate(`${value}T00:00:00Z`, locale, 'UTC');
  if (!prediction) return <div className="core-panel-grid" data-testid="prediction-core-panel">
    <Card eyebrow={t('prediction.eyebrow.local')} title={t('prediction.title')}><p>{t('prediction.needHistory')}</p><p className="workspace-note">{t('prediction.noInvent')}</p></Card>
    <Card eyebrow={t('prediction.historyEyebrow')} title={t('prediction.historyAccuracy')}><p>{t('prediction.historyCount',{count:historyCount})}</p><p>{t('prediction.noAccuracy')}</p></Card>
  </div>;

  const pmsStart=addDays(prediction.mostLikelyDate,-7), pmsEnd=addDays(prediction.mostLikelyDate,-1);
  const ovulation=addDays(prediction.mostLikelyDate,-14), fertileStart=addDays(ovulation,-5), fertileEnd=addDays(ovulation,1);
  return <div className="core-panel-grid" data-testid="prediction-core-panel">
    <Card eyebrow={t('prediction.v1')} title={t('prediction.title')}>
      <dl className="prediction-summary"><div><dt>{t('prediction.mostLikely')}</dt><dd>{displayDate(prediction.mostLikelyDate)}</dd></div><div><dt>{t('prediction.expectedRange')}</dt><dd>{displayDate(prediction.windowStart)} – {displayDate(prediction.windowEnd)}</dd></div><div><dt>{t('prediction.confidence')}</dt><dd>{prediction.confidence}</dd></div></dl>
      <p>{t('prediction.basedOn',{count:prediction.validIntervals.length})}</p><p className="workspace-note">{t('prediction.boundary')}</p>
    </Card>
    <Card eyebrow={t('prediction.howEyebrow')} title={t('prediction.contextTitle')}>
      <p>{t('prediction.cycleLength',{days:prediction.estimatedCycleLengthDays})}</p>
      <p>{prediction.estimatedPeriodDurationDays==null?t('prediction.periodDurationMissing'):t('prediction.periodDuration',{days:prediction.estimatedPeriodDurationDays})}</p>
      <p>{t('prediction.variability',{days:prediction.medianAbsoluteDeviation})}</p><p>{t('prediction.algorithm',{version:prediction.algorithmVersion})}</p>
      {prediction.excludedIntervals.length>0?<p className="workspace-note">{t('prediction.excluded',{count:prediction.excludedIntervals.length})}</p>:null}
    </Card>
    <Card eyebrow={t('prediction.pmsEyebrow')} title={t('prediction.pmsTitle')}><p>{displayDate(pmsStart)} – {displayDate(pmsEnd)}</p><p className="workspace-note">{t('prediction.pmsBoundary')}</p></Card>
    <Card eyebrow={t('prediction.fertilityEyebrow')} title={t('prediction.fertilityTitle')}>
      {fertilityEstimatesEnabled?<><p>{t('prediction.ovulation',{date:displayDate(ovulation)})}</p><p>{t('prediction.fertileWindow',{start:displayDate(fertileStart),end:displayDate(fertileEnd)})}</p><p className="workspace-note">{t('prediction.fertilityBoundary')}</p></>:<><p>{t('prediction.fertilityUnavailable')}</p><p className="workspace-note">{t('prediction.fertilityHidden')}</p></>}
    </Card>
    <Card eyebrow={t('prediction.historyEyebrow')} title={t('prediction.localAccuracy')}>
      <p>{t('prediction.historyCount',{count:historyCount})}</p>
      {evaluation&&evaluation.sampleCount>0?<><p>{t('prediction.evaluated',{count:evaluation.sampleCount})}</p><p>{t('prediction.mae',{days:evaluation.meanAbsoluteErrorDays.toFixed(1)})}</p><p>{t('prediction.coverage',{percent:Math.round(evaluation.windowCoverage*100)})}</p></>:<p>{t('prediction.noScore')}</p>}
      <p className="workspace-note">{t('prediction.localHistory')}</p>
    </Card>
  </div>;
}
