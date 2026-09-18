import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { HealthObservation, PeriodEpisode } from '../../domain/cycle/types';
import { CalendarCorePanel } from '../calendar/CalendarCorePanel';
import { CycleCorePanel } from '../cycle/CycleCorePanel';
import { HomeCorePanel } from '../home/HomeCorePanel';
import { LogCorePanel } from '../logging/LogCorePanel';
import type { PredictionResult } from '../predictions/prediction-engine';
import { TodayCorePanel } from '../logging/TodayCorePanel';

const periods: PeriodEpisode[] = [{
  id: 'period-1',
  start: '2026-09-10T00:00:00.000Z',
  end: '2026-09-12T00:00:00.000Z',
  source: 'app',
}];

const observations: HealthObservation[] = [{
  id: 'observation-1',
  kind: 'cramps',
  occurredAt: '2026-09-16T09:00:00.000Z',
  severity: 'mild',
  note: 'Local note',
  source: 'app',
}];

const prediction: PredictionResult = {
  algorithmVersion: 'prediction-v1',
  estimatedCycleLengthDays: 28,
  estimatedPeriodDurationDays: 5,
  mostLikelyDate: '2026-10-08',
  windowStart: '2026-10-06',
  windowEnd: '2026-10-10',
  confidence: 'high',
  validIntervals: [28, 28, 28, 28, 28, 28],
  excludedIntervals: [],
  medianAbsoluteDeviation: 0,
};

const noop = vi.fn();

describe('account-free workspace panels', () => {
  it('renders Home as a real local summary with current local prediction intelligence', () => {
    const html = renderToStaticMarkup(
      <HomeCorePanel
        periods={periods}
        observations={observations}
        prediction={prediction}
        onStartPeriodToday={noop}
      />,
    );

    expect(html).toContain('Private local summary');
    expect(html).toContain('Period started today');
    expect(html).toContain('1 recorded period');
    expect(html).toContain('1 local observation');
    expect(html).toContain('Most likely');
    expect(html).toContain('8 Oct 2026');
    expect(html).toContain('6 Oct 2026 – 10 Oct 2026');
    expect(html).toContain('High confidence');
    expect(html).not.toContain('added in the next governed task');
  });

  it('renders Today from local observations without implying diagnosis', () => {
    const html = renderToStaticMarkup(
      <TodayCorePanel observations={observations} today="2026-09-16" />,
    );

    expect(html).toContain('Today');
    expect(html).toContain('Cramps');
    expect(html).toContain('Mild');
    expect(html).toContain('Local note');
    expect(html).toContain('Observation is not diagnosis');
  });

  it('renders Log with all 36 canonical observation kinds and local-only wording', () => {
    const html = renderToStaticMarkup(
      <LogCorePanel observations={observations} onLog={noop} onDelete={noop} />,
    );

    expect((html.match(/<option/g) ?? [])).toHaveLength(36);
    expect(html).toContain('How are you today?');
    expect(html).toContain('Cramps');
    expect(html).toContain('Private daily note');
    expect(html).toContain('Everything you save here stays in the encrypted local vault');
  });

  it('renders Calendar with Month, Timeline, and Year modes', () => {
    const html = renderToStaticMarkup(
      <CalendarCorePanel
        mode="month"
        periods={periods}
        yearGroups={[]}
        selectedYear={2026}
        selectedMonth={9}
        onModeChange={noop}
        onMonthChange={noop}
      />,
    );

    for (const label of ['Month', 'Timeline', 'Year']) expect(html).toContain(label);
    expect(html).toContain('Calendar &amp; history');
    expect(html).toContain('10 Sep 2026');
  });

  it('renders Cycle with real edit/end/delete controls', () => {
    const html = renderToStaticMarkup(
      <CycleCorePanel
        periods={periods}
        cycleNotes={[]}
        onStartPeriodToday={noop}
        onEndPeriod={noop}
        onEditPeriod={noop}
        onDeletePeriod={noop}
        onSaveCycleNote={noop}
        onDeleteCycleNote={noop}
      />,
    );

    expect(html).toContain('Cycle &amp; periods');
    expect(html).toContain('Period started today');
    expect(html).toContain('Save dates');
    expect(html).toContain('Delete');
    expect(html).toContain('3 recorded period days');
  });
});
