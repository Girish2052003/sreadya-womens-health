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

export type ReportCopy = {
  title: string;
  disclaimer: string;
  periodsHeading: string;
  ongoing: string;
  observationsHeading: string;
  pdfSubject: string;
  pdfProducer: string;
  kindLabel: (kind: string) => string;
  severityLabel: (severity: string) => string;
  flowLabel: (flow: string) => string;
};

function assertSelection(selection: ReportSelection): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(selection.from) || !/^\d{4}-\d{2}-\d{2}$/.test(selection.to)) {
    throw new Error('report_invalid_date_range');
  }
  if (selection.from > selection.to) throw new Error('report_start_after_end');
  if (selection.categories.length === 0) throw new Error('report_no_categories');
  if (selection.categories.some((category) => !(REPORT_CATEGORIES as readonly string[]).includes(category))) {
    throw new Error('report_unsupported_category');
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

function technicalObservationValue(observation: HealthObservation): string {
  if (observation.flowLevel) return observation.flowLevel;
  if (observation.severity) return observation.severity;
  if (observation.numericValue !== undefined) {
    return `${observation.numericValue}${observation.unit ? ` ${observation.unit}` : ''}`;
  }
  return '';
}

function localizedObservationValue(observation: HealthObservation, copy: ReportCopy): string {
  if (observation.flowLevel) return copy.flowLabel(observation.flowLevel);
  if (observation.severity) return copy.severityLabel(observation.severity);
  return technicalObservationValue(observation);
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

function previewLines(input: ReportInput, copy: ReportCopy): string[] {
  const { categories, periods, observations } = selectedRecords(input);
  const lines = [
    copy.title,
    `${input.selection.from} – ${input.selection.to}`,
    copy.disclaimer,
  ];

  if (categories.has('periods')) {
    lines.push('', copy.periodsHeading);
    for (const period of periods) {
      lines.push(`${period.start}${period.end ? ` – ${period.end}` : ` – ${copy.ongoing}`}`);
    }
  }

  lines.push('', copy.observationsHeading);
  for (const observation of observations) {
    const note = categories.has('privateNotes') && observation.note ? ` · ${observation.note}` : '';
    const value = localizedObservationValue(observation, copy);
    const label = observation.label ?? copy.kindLabel(observation.kind);
    lines.push(
      `${observation.occurredAt} · ${label}${value ? ` · ${value}` : ''}${note}`,
    );
  }
  return lines;
}

export function buildReportPreview(input: ReportInput, copy: ReportCopy): string {
  return previewLines(input, copy).join('\n');
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
      technicalObservationValue(observation),
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

export async function buildPdfReport(input: ReportInput, copy: ReportCopy): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const lines = previewLines(input, copy);

  // pdf-lib's built-in StandardFonts are WinAnsi. Prove every rendered line
  // is encodable before creating a partial document. Non-WinAnsi scripts fail
  // closed and the UI surfaces a localized explanation instead of English fallback.
  try {
    for (const line of lines) {
      if (!line) continue;
      const heading = line === copy.title
        || line === copy.periodsHeading
        || line === copy.observationsHeading;
      (heading ? bold : font).encodeText(line);
    }
  } catch {
    throw new Error('report_pdf_font_unsupported');
  }

  document.setTitle(copy.title);
  document.setSubject(copy.pdfSubject);
  document.setProducer(copy.pdfProducer);

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

  lines.forEach((line) => {
    if (line === '') {
      y -= 8;
      return;
    }
    const heading = line === copy.title
      || line === copy.periodsHeading
      || line === copy.observationsHeading;
    for (const wrapped of wrapLine(line)) addLine(wrapped, heading);
  });

  return document.save();
}
