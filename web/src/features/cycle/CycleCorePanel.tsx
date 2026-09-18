'use client';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import type { HealthObservation, PeriodEpisode } from '../../domain/cycle/types';
import { formatDateInput, formatUtcDate, periodDurationDays } from '../core/presentation';
import type { PeriodEdit } from './period-actions';

function dateInputToUtc(value: string): string {
  return `${value}T00:00:00.000Z`;
}

export function CycleCorePanel({
  periods,
  cycleNotes,
  onStartPeriodToday,
  onEndPeriod,
  onEditPeriod,
  onDeletePeriod,
  onSaveCycleNote,
  onDeleteCycleNote,
}: {
  periods: PeriodEpisode[];
  cycleNotes: HealthObservation[];
  onStartPeriodToday: () => void;
  onEndPeriod: (id: string) => void;
  onEditPeriod: (id: string, edit: PeriodEdit) => void;
  onDeletePeriod: (id: string) => void;
  onSaveCycleNote: (period: PeriodEpisode, note: string) => void;
  onDeleteCycleNote: (id: string) => void;
}) {
  const recent = [...periods].reverse();

  return (
    <div className="core-panel-grid">
      <Card eyebrow="Cycle" title="Cycle & periods">
        <p>Record the dates that are true for you. Sreadya does not force a 28-day-cycle assumption.</p>
        <Button onClick={onStartPeriodToday}>Period started today</Button>
      </Card>

      <Card eyebrow="Local history" title={recent.length === 0 ? 'No period history yet' : 'Your recorded periods'}>
        {recent.length === 0 ? <p>Start a period when it is useful to you, or add a historical date below later.</p> : (
          <div className="core-period-list">
            {recent.map((period) => {
              const duration = periodDurationDays(period);
              const note = cycleNotes.find((item) => item.label === `cycle-note:${period.id}`);
              return (
                <section key={period.id} className="core-period-card" aria-labelledby={`period-${period.id}`}>
                  <div className="core-period-card__summary">
                    <h3 id={`period-${period.id}`}>{formatUtcDate(period.start)}</h3>
                    <p>{period.end ? `${duration ?? 0} recorded period days · ended ${formatUtcDate(period.end)}` : 'Ongoing period'}</p>
                  </div>

                  <form
                    className="core-date-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const data = new FormData(event.currentTarget);
                      const start = String(data.get('start'));
                      const end = String(data.get('end') ?? '');
                      onEditPeriod(period.id, {
                        start: dateInputToUtc(start),
                        end: end.length > 0 ? dateInputToUtc(end) : null,
                      });
                    }}
                  >
                    <label><span>Start</span><input name="start" type="date" required defaultValue={formatDateInput(period.start)} /></label>
                    <label><span>End</span><input name="end" type="date" defaultValue={period.end ? formatDateInput(period.end) : ''} /></label>
                    <Button type="submit" variant="secondary">Save dates</Button>
                  </form>

                  <form
                    className="structured-observation__form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const value = String(new FormData(event.currentTarget).get('cycle-note') ?? '').trim();
                      if (value) onSaveCycleNote(period, value);
                    }}
                  >
                    <label>
                      <span>Cycle / period note</span>
                      <textarea name="cycle-note" rows={2} maxLength={2000} defaultValue={note?.note ?? ''} />
                    </label>
                    <div className="core-actions">
                      <Button type="submit" variant="secondary">Save cycle note</Button>
                      {note ? <Button variant="quiet" onClick={() => onDeleteCycleNote(note.id)}>Delete note</Button> : null}
                    </div>
                  </form>

                  <div className="core-actions">
                    {period.end == null ? <Button variant="secondary" onClick={() => onEndPeriod(period.id)}>Mark period ended today</Button> : null}
                    <Button variant="quiet" onClick={() => onDeletePeriod(period.id)}>Delete</Button>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
