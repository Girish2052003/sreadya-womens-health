import Link from 'next/link';

import { Card } from '../../components/ui/Card';
import type { HealthObservation } from '../../domain/cycle/types';
import { observationLabel, titleCase } from '../core/presentation';

export function TodayCorePanel({ observations, today }: { observations: HealthObservation[]; today: string }) {
  const todayItems = observations.filter((observation) => observation.occurredAt.startsWith(today)).reverse();

  return (
    <div className="core-panel-grid">
      <Card eyebrow="Today" title="Your local check-in">
        <p>{todayItems.length === 0 ? 'Nothing logged today. Everything is optional.' : `${todayItems.length} local entr${todayItems.length === 1 ? 'y' : 'ies'} today.`}</p>
        <Link className="link-button link-button--primary" href="/app/log">Log today</Link>
      </Card>

      <Card eyebrow="Today’s local logs" title={todayItems.length === 0 ? 'A quiet day is still a valid day' : 'What you recorded'}>
        {todayItems.length === 0 ? (
          <p>No observations saved for this date.</p>
        ) : (
          <ul className="core-record-list">
            {todayItems.map((item) => (
              <li key={item.id}>
                <strong>{observationLabel(item.kind)}</strong>
                {item.severity ? <span>{titleCase(item.severity)}</span> : null}
                {item.note ? <p>{item.note}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card eyebrow="Health boundary" title="Observation is not diagnosis">
        <p>Sreva keeps your own records readable without turning a symptom log into a medical conclusion.</p>
      </Card>
    </div>
  );
}
