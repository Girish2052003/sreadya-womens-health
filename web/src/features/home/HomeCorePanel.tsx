'use client';

import Link from 'next/link';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import type { HealthObservation, PeriodEpisode } from '../../domain/cycle/types';
import type { PredictionResult } from '../../domain/prediction/types';
import { formatLocaleDate, isEnglishLocale } from '../../i18n/locale';
import { useI18n } from '../../i18n/I18nProvider';
import { formatUtcDate, observationLabel, titleCase } from '../core/presentation';

export function HomeCorePanel({ periods, observations, prediction, onStartPeriodToday }: {
  periods: PeriodEpisode[];
  observations: HealthObservation[];
  prediction: PredictionResult | null;
  onStartPeriodToday: () => void;
}) {
  const { t, plural, locale } = useI18n();
  const latestPeriod = periods.at(-1);
  const latestObservation = observations.at(-1);
  const date = (value: string) => isEnglishLocale(locale) ? formatUtcDate(value) : formatLocaleDate(value, locale, 'UTC');
  const observationName = (kind: HealthObservation['kind']) => t(`observation.kind.${kind}`, {}, observationLabel(kind));

  return (
    <div className="core-panel-grid">
      <Card eyebrow={t('homeCore.eyebrow.summary')} title={t('homeCore.title.today')}>
        <p>{plural('homeCore.periodCount', periods.length, { count: periods.length })} · {plural('homeCore.observationCount', observations.length, { count: observations.length })}</p>
        <div className="core-actions">
          <Button onClick={onStartPeriodToday}>{t('homeCore.periodStarted')}</Button>
          <Link className="link-button link-button--quiet" href="/app/log">{t('homeCore.logFeel')}</Link>
        </div>
      </Card>

      <Card eyebrow={t('homeCore.eyebrow.cycle')} title={latestPeriod ? t('homeCore.latestPeriod', { date: date(latestPeriod.start) }) : t('homeCore.noPeriod')}>
        <p>{latestPeriod?.end ? t('homeCore.ended', { date: date(latestPeriod.end) }) : latestPeriod ? t('homeCore.ongoing') : t('homeCore.startHint')}</p>
        <Link className="workspace-text-link" href="/app/cycle">{t('homeCore.openCycle')}</Link>
      </Card>

      <Card eyebrow={t('homeCore.eyebrow.recent')} title={latestObservation ? observationName(latestObservation.kind) : t('homeCore.nothingLogged')}>
        <p>{latestObservation?.note ?? t('homeCore.observationHint')}</p>
        <Link className="workspace-text-link" href="/app/today">{t('homeCore.seeToday')}</Link>
      </Card>

      <Card eyebrow={t('homeCore.eyebrow.intelligence')} title={prediction ? t('homeCore.mostLikely', { date: date(`${prediction.mostLikelyDate}T00:00:00.000Z`) }) : t('homeCore.moreHistory')}>
        {prediction ? (
          <>
            <p>{date(`${prediction.windowStart}T00:00:00.000Z`)} – {date(`${prediction.windowEnd}T00:00:00.000Z`)}</p>
            <p>{t('homeCore.confidence', { confidence: titleCase(prediction.confidence), count: prediction.validIntervals.length })}</p>
          </>
        ) : <p>{t('homeCore.predictionHint')}</p>}
        <Link className="workspace-text-link" href="/app/predictions">{t('homeCore.openPredictions')}</Link>
      </Card>
    </div>
  );
}
