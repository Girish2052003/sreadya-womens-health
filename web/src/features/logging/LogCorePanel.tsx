'use client';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { OBSERVATION_KINDS, type HealthObservation } from '../../domain/cycle/types';
import { observationLabel, titleCase } from '../core/presentation';

export function LogCorePanel({
  observations,
  onLog,
  onDelete,
}: {
  observations: HealthObservation[];
  onLog: (kind: HealthObservation['kind'], note?: string) => void;
  onDelete: (id: string) => void;
}) {
  const recent = observations.slice(-12).reverse();

  return (
    <div className="core-panel-grid">
      <Card eyebrow="Log today" title="How are you today?">
        <p>Everything is optional. Everything you save here stays in the encrypted local vault unless you deliberately export or later enable reviewed encrypted continuity.</p>
        <form
          className="core-form"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const kind = data.get('observation-kind') as HealthObservation['kind'];
            const rawNote = String(data.get('observation-note') ?? '').trim();
            onLog(kind, rawNote.length > 0 ? rawNote : undefined);
            event.currentTarget.reset();
          }}
        >
          <label htmlFor="observation-kind">What would you like to record?</label>
          <select id="observation-kind" name="observation-kind" defaultValue="cramps">
            {OBSERVATION_KINDS.map((kind) => <option key={kind} value={kind}>{observationLabel(kind)}</option>)}
          </select>

          <label htmlFor="observation-note">Optional private note</label>
          <textarea id="observation-note" name="observation-note" rows={3} placeholder="Add context only if it is useful to you" />
          <Button type="submit">Save local observation</Button>
        </form>
      </Card>

      <Card eyebrow="Recent local logs" title={recent.length === 0 ? 'Nothing logged yet' : 'Your latest entries'}>
        {recent.length === 0 ? <p>No observations logged yet.</p> : (
          <ul className="core-record-list">
            {recent.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.label ?? observationLabel(item.kind)}</strong>
                  {item.severity ? <span>{titleCase(item.severity)}</span> : null}
                  {item.note ? <p>{item.note}</p> : null}
                </div>
                <Button variant="quiet" aria-label={`Delete ${observationLabel(item.kind)}`} onClick={() => onDelete(item.id)}>Delete</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card eyebrow="Medical boundary" title="Your notes stay observations">
        <p>Sreva records what you choose to notice. It does not turn a symptom log into a diagnosis.</p>
      </Card>
    </div>
  );
}
