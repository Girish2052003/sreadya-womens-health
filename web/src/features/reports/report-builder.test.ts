import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import type { HealthObservation, PeriodEpisode } from '../../domain/cycle/types';
import {
  REPORT_CAPABILITY_IDS,
  SAFE_REPORT_CATEGORIES,
  buildCsvReport,
  buildPdfReport,
  buildReportPreview,
  type ReportCopy,
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
const copy: ReportCopy = {
  title: 'Sreadya cycle history report',
  disclaimer: 'Generated locally on this device. This report is not a diagnosis.',
  periodsHeading: 'Periods',
  ongoing: 'ongoing',
  observationsHeading: 'Selected observations',
  pdfSubject: 'Locally generated Sreadya health report',
  pdfProducer: 'Sreadya Web local report generator',
  kindLabel: (kind) => ({ menstrualFlow: 'Menstrual flow', cramps: 'Cramps', basalBodyTemperature: 'Basal body temperature' })[kind] ?? kind,
  severityLabel: (severity) => ({ moderate: 'Moderate' })[severity] ?? severity,
  flowLabel: (flow) => ({ heavy: 'Heavy' })[flow] ?? flow,
};

describe('Task 13 local doctor reports', () => {
  it('covers RPT-001 through RPT-013 and excludes highly private categories by default', () => {
    expect(REPORT_CAPABILITY_IDS).toHaveLength(13);
    expect(REPORT_CAPABILITY_IDS[0]).toBe('RPT-001');
    expect(REPORT_CAPABILITY_IDS.at(-1)).toBe('RPT-013');
    expect(SAFE_REPORT_CATEGORIES).not.toContain('privateNotes');
    expect(SAFE_REPORT_CATEGORIES).not.toContain('sexualActivity');
  });

  it('builds a localized local preview while keeping CSV a stable technical export', () => {
    const selection = { categories: [...SAFE_REPORT_CATEGORIES], ...range };
    const preview = buildReportPreview({ periods, observations, selection }, copy);
    const csv = buildCsvReport({ periods, observations, selection });

    expect(preview).toContain('Sreadya cycle history report');
    expect(preview).toContain('Generated locally on this device. This report is not a diagnosis.');
    expect(preview).toContain('2026-09-01');
    expect(preview).toContain('Menstrual flow');
    expect(preview).toContain('Cramps');
    expect(preview).toContain('Basal body temperature');
    expect(preview).toContain('Heavy');
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

  it('generates a valid PDF locally when the selected copy is encodable', async () => {
    const bytes = await buildPdfReport({
      periods,
      observations,
      selection: { categories: [...SAFE_REPORT_CATEGORIES], ...range },
    }, copy);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(0);
    expect(pdf.getTitle()).toBe('Sreadya cycle history report');
  });

  it('fails closed before PDF rendering when the built-in font cannot encode the selected script', async () => {
    await expect(buildPdfReport({
      periods,
      observations,
      selection: { categories: [...SAFE_REPORT_CATEGORIES], ...range },
    }, { ...copy, title: 'சுழற்சி அறிக்கை' })).rejects.toThrow('report_pdf_font_unsupported');
  });
});
