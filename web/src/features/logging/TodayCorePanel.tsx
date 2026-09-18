'use client';

import Link from 'next/link';

import { Card } from '../../components/ui/Card';
import type { HealthObservation } from '../../domain/cycle/types';
import { useI18n } from '../../i18n/I18nProvider';
import { observationLabel, titleCase } from '../core/presentation';

export function TodayCorePanel({ observations, today }: { observations: HealthObservation[]; today: string }) {
  const { t } = useI18n();
  const todayItems = observations.filter((observation) => observation.occurredAt.startsWith(today)).reverse();
  const observationName = (kind: HealthObservation['kind']) => t(`observation.kind.${kind}`, {}, observationLabel(kind));
  return (
    <div className="core-panel-grid">
      <Card eyebrow={t('today.eyebrow')} title={t('today.title')}><p>{todayItems.length === 0 ? t('today.empty') : t('today.count', { count: todayItems.length })}</p><Link className="link-button link-button--primary" href="/app/log">{t('today.log')}</Link></Card>
      <Card eyebrow={t('today.logsEyebrow')} title={todayItems.length === 0 ? t('today.quiet') : t('today.recorded')}>
        {todayItems.length === 0 ? <p>{t('today.none')}</p> : <ul className="core-record-list">{todayItems.map((item) => <li key={item.id}><strong>{observationName(item.kind)}</strong>{item.severity ? <span>{t(`observation.severity.${item.severity}`, {}, titleCase(item.severity))}</span> : null}{item.note ? <p>{item.note}</p> : null}</li>)}</ul>}
      </Card>
      <Card eyebrow={t('today.boundaryEyebrow')} title={t('today.boundaryTitle')}><p>{t('today.boundaryBody')}</p></Card>
    </div>
  );
}
