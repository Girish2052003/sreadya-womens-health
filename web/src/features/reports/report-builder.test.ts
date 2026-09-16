import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import type { HealthObservation, PeriodEpisode } from '../../domain/cycle/types';
import {
  REPORT_CAPABILITY_IDS,
  SAFE_REPORT_CATEGORIES,
  buildCsvReport,
  buildPdfReport,
  buildReportPreview,
} from './report-builder';

const periods: PeriodEpisode[] = [
  { id: 'p1', start: '2026-08-01T00:00:00.000Z', end: '2026-08-05T00:00:00.000Z', source: 'app' },
  { id: 'p2', start: '2026-09-01T00:00:00.000Z', end: '2026-09-04T00:00:00.000Z', source: 'app' },
];

const observations: HealthObservation[] = [
  { id: 'flow', kind: 'menstrualFlow', occurredAt: '2026-09-02T08:00:00.000Z', flowLevel: 'heavy', source: 'app' },
  { id: 'pain', kind: 'cramps', occurredAt: '2026-09-02T09:00:00.000Z', severity: 'moderate', note: 'private pain note', source: 'app' },
  { id: 'sex', kind: 'sexualActivity', occurredAt: '2026-09-03T09:00:00.000Z', note: 'private sexual note', source: 'app' },
  { id: 'temp', kind: 'basalBodyTemperature', occurredAt: '2026-09-03T07:00:00.000Z', numericValue: 36.6, unit: '°C', source: 'app' },
];

const range = { from: '2026-09-01', to: '2026-09-30' };

describe('Task 13 local doctor reports', () => {
  it('covers RPT-001 through RPT-013 and excludes highly private categories by default', () => {
    expect(REPORT_CAPABILITY_IDS).toHaveLength(13);
    expect(REPORT_CAPABILITY_IDS[0]).toBe('RPT-001');
    expect(REPORT_CAPABILITY_IDS.at(-1)).toBe('RPT-013');
    expect(SAFE_REPORT_CATEGORIES).not.toContain('privateNotes');
    expect(SAFE_REPORT_CATEGORIES).not.toContain('sexualActivity');
  });

  it('builds a local preview and CSV from exactly the selected date range/categories', () => {
    const selection = { categories: [...SAFE_REPORT_CATEGORIES], ...range };
    const preview = buildReportPreview({ periods, observations, selection });
    const csv = buildCsvReport({ periods, observations, selection });

    expect(preview).toContain('Sreva cycle history report');
    expect(preview).toContain('Generated locally on this device. This report is not a diagnosis.');
    expect(preview).toContain('2026-09-01');
    expect(preview).toContain('menstrualFlow');
    expect(preview).toContain('cramps');
    expect(preview).toContain('basalBodyTemperature');
    expect(preview).not.toContain('2026-08-01');
    expect(preview).not.toContain('sexualActivity');
    expect(preview).not.toContain('private pain note');
    expect(preview).not.toContain('private sexual note');

    expect(csv).toContain('"record_type","date","kind","value","note"');
    expect(csv).toContain('"period","2026-09-01T00:00:00.000Z","period","2026-09-04T00:00:00.000Z",""');
    expect(csv).toContain('"observation","2026-09-02T08:00:00.000Z","menstrualFlow","heavy",""');
    expect(csv).not.toContain('sexualActivity');
    expect(csv).not.toContain('private pain note');
  });

  it('includes highly private content only after explicit category selection', () => {
    const selection = {
      categories: ['periods', 'pain', 'privateNotes', 'sexualActivity'] as const,
      ...range,
    };
    const csv = buildCsvReport({ periods, observations, selection });

    expect(csv).toContain('private pain note');
    expect(csv).toContain('sexualActivity');
    expect(csv).toContain('private sexual note');
  });

  it('generates a valid PDF locally with pdf-lib', async () => {
    const bytes = await buildPdfReport({
      periods,
      observations,
      selection: { categories: [...SAFE_REPORT_CATEGORIES], ...range },
    });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(0);
    expect(pdf.getTitle()).toBe('Sreva cycle history report');
  });
});
