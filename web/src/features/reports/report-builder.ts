import { PDFDocument, StandardFonts } from 'pdf-lib';

import type { HealthObservation, PeriodEpisode } from '../../domain/cycle/types';

export const REPORT_CAPABILITY_IDS = [
  'RPT-001', 'RPT-002', 'RPT-003', 'RPT-004', 'RPT-005',
  'RPT-006', 'RPT-007', 'RPT-008', 'RPT-009', 'RPT-010',
  'RPT-011', 'RPT-012', 'RPT-013',
] as const;

export const REPORT_CATEGORIES = [
  'periods',
  'flow',
  'symptoms',
  'pain',
  'medications',
  'temperature',
  'ovulation',
  'privateNotes',
  'sexualActivity',
] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export const SAFE_REPORT_CATEGORIES: readonly ReportCategory[] = Object.freeze([
  'periods',
  'flow',
  'symptoms',
  'pain',
  'medications',
  'temperature',
  'ovulation',
]);

export type ReportSelection = {
  categories: readonly ReportCategory[];
  from: string;
  to: string;
};

type ReportInput = {
  periods: readonly PeriodEpisode[];
  observations: readonly HealthObservation[];
  selection: ReportSelection;
};

function assertSelection(selection: ReportSelection): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(selection.from) || !/^\d{4}-\d{2}-\d{2}$/.test(selection.to)) {
    throw new Error('Report date range must use calendar dates.');
  }
  if (selection.from > selection.to) throw new Error('Report start date cannot be after end date.');
  if (selection.categories.length === 0) throw new Error('Select at least one report category.');
  if (selection.categories.some((category) => !(REPORT_CATEGORIES as readonly string[]).includes(category))) {
    throw new Error('Unsupported report category.');
  }
}

function inRange(timestamp: string, selection: ReportSelection): boolean {
  const day = timestamp.slice(0, 10);
  return day >= selection.from && day <= selection.to;
}

function includesObservation(observation: HealthObservation, categories: ReadonlySet<ReportCategory>): boolean {
  if (observation.kind === 'sexualActivity') return categories.has('sexualActivity');
  switch (observation.kind) {
    case 'menstrualFlow':
      return categories.has('flow');
    case 'medication':
    case 'supplement':
      return categories.has('medications');
    case 'basalBodyTemperature':
      return categories.has('temperature');
    case 'ovulationTest':
    case 'cervicalMucus':
      return categories.has('ovulation');
    case 'cramps':
    case 'backPain':
    case 'headache':
    case 'migraine':
      return categories.has('pain');
    default:
      return categories.has('symptoms');
  }
}

function observationValue(observation: HealthObservation): string {
  if (observation.flowLevel) return observation.flowLevel;
  if (observation.severity) return observation.severity;
  if (observation.numericValue !== undefined) {
    return `${observation.numericValue}${observation.unit ? ` ${observation.unit}` : ''}`;
  }
  return '';
}

function selectedRecords(input: ReportInput) {
  assertSelection(input.selection);
  const categories = new Set(input.selection.categories);
  const periods = categories.has('periods')
    ? input.periods.filter((period) => inRange(period.start, input.selection))
    : [];
  const observations = input.observations.filter(
    (observation) => inRange(observation.occurredAt, input.selection)
      && includesObservation(observation, categories),
  );
  return { categories, periods, observations };
}

function previewLines(input: ReportInput): string[] {
  const { categories, periods, observations } = selectedRecords(input);
  const lines = [
    'Sreva cycle history report',
    `${input.selection.from} – ${input.selection.to}`,
    'Generated locally on this device. This report is not a diagnosis.',
  ];

  if (categories.has('periods')) {
    lines.push('', 'Periods');
    for (const period of periods) {
      lines.push(`${period.start}${period.end ? ` – ${period.end}` : ' – ongoing'}`);
    }
  }

  lines.push('', 'Selected observations');
  for (const observation of observations) {
    const note = categories.has('privateNotes') && observation.note ? ` · ${observation.note}` : '';
    const value = observationValue(observation);
    lines.push(
      `${observation.occurredAt} · ${observation.label ?? observation.kind}${value ? ` · ${value}` : ''}${note}`,
    );
  }
  return lines;
}

export function buildReportPreview(input: ReportInput): string {
  return previewLines(input).join('\n');
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function buildCsvReport(input: ReportInput): string {
  const { categories, periods, observations } = selectedRecords(input);
  const rows: string[][] = [['record_type', 'date', 'kind', 'value', 'note']];

  for (const period of periods) {
    rows.push([
      'period',
      period.start,
      'period',
      period.end ?? 'ongoing',
      '',
    ]);
  }

  for (const observation of observations) {
    rows.push([
      'observation',
      observation.occurredAt,
      observation.label ?? observation.kind,
      observationValue(observation),
      categories.has('privateNotes') ? observation.note ?? '' : '',
    ]);
  }

  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}

function wrapLine(line: string, width = 88): string[] {
  if (line.length <= width) return [line];
  const words = line.split(' ');
  const result: string[] = [];
  let current = '';
  for (const word of words) {
    if (current.length > 0 && `${current} ${word}`.length > width) {
      result.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) result.push(current);
  return result;
}

export async function buildPdfReport(input: ReportInput): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.setTitle('Sreva cycle history report');
  document.setSubject('Locally generated Sreva health report');
  document.setProducer('Sreva Web local report generator');
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);

  let page = document.addPage([595, 842]);
  let y = 800;
  const addLine = (line: string, heading = false) => {
    if (y < 55) {
      page = document.addPage([595, 842]);
      y = 800;
    }
    page.drawText(line, {
      x: 48,
      y,
      size: heading ? 15 : 10,
      font: heading ? bold : font,
    });
    y -= heading ? 24 : 16;
  };

  const lines = previewLines(input);
  lines.forEach((line, index) => {
    if (line === '') {
      y -= 8;
      return;
    }
    const heading = index === 0 || line === 'Periods' || line === 'Selected observations';
    for (const wrapped of wrapLine(line)) addLine(wrapped, heading);
  });

  return document.save();
}
