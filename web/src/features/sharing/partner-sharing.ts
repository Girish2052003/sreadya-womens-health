export const PARTNER_CAPABILITY_IDS = [
  'PART-001', 'PART-002', 'PART-003', 'PART-004', 'PART-005',
  'PART-006', 'PART-007', 'PART-008', 'PART-009', 'PART-010',
] as const;

export const PARTNER_SHARE_CATEGORIES = [
  'prediction',
  'cyclePhase',
  'selectedReminder',
  'selectedWellness',
] as const;
export type PartnerShareCategory = (typeof PARTNER_SHARE_CATEGORIES)[number];

export type PartnerGrant = {
  id: string;
  categories: readonly PartnerShareCategory[];
  createdAt: string;
  revokedAt?: string;
};

export type PartnerShareValues = {
  predictionWindow?: string;
  cyclePhase?: string;
  selectedReminder?: string;
  selectedWellness?: string;
};

export type PartnerShareCopy = {
  title: string;
  footer: string;
  labels: Readonly<Record<PartnerShareCategory, string>>;
  formatRow: (label: string, value: string) => string;
};

export type PartnerSharePackage = {
  summary: string;
  qrPayload: string;
  shareText: string;
};

function assertIsoTimestamp(value: string): void {
  if (!Number.isFinite(Date.parse(value)) || !value.endsWith('Z')) {
    throw new Error('partner_timestamp_invalid');
  }
}

function assertCategories(categories: readonly PartnerShareCategory[]): void {
  if (categories.length === 0) throw new Error('partner_categories_empty');
  if (categories.some((category) => !(PARTNER_SHARE_CATEGORIES as readonly string[]).includes(category))) {
    throw new Error('partner_category_unsupported');
  }
}

export function createPartnerGrant({
  id,
  categories,
  createdAt,
}: {
  id: string;
  categories: readonly PartnerShareCategory[];
  createdAt: string;
}): PartnerGrant {
  if (!id.trim()) throw new Error('partner_grant_id_required');
  assertCategories(categories);
  assertIsoTimestamp(createdAt);
  return Object.freeze({ id, categories: Object.freeze([...new Set(categories)]), createdAt });
}

export function revokePartnerGrant(grant: PartnerGrant, revokedAt: string): PartnerGrant {
  assertIsoTimestamp(revokedAt);
  if (Date.parse(revokedAt) < Date.parse(grant.createdAt)) {
    throw new Error('partner_revoke_before_create');
  }
  return Object.freeze({ ...grant, categories: Object.freeze([...grant.categories]), revokedAt });
}

export function buildPartnerSharePackage({
  grant,
  copy,
  predictionWindow,
  cyclePhase,
  selectedReminder,
  selectedWellness,
}: { grant: PartnerGrant; copy: PartnerShareCopy } & PartnerShareValues): PartnerSharePackage {
  if (grant.revokedAt) throw new Error('partner_grant_revoked');
  assertCategories(grant.categories);

  const lines = [copy.title];
  if (grant.categories.includes('prediction') && predictionWindow) {
    lines.push(copy.formatRow(copy.labels.prediction, predictionWindow));
  }
  if (grant.categories.includes('cyclePhase') && cyclePhase) {
    lines.push(copy.formatRow(copy.labels.cyclePhase, cyclePhase));
  }
  if (grant.categories.includes('selectedReminder') && selectedReminder) {
    lines.push(copy.formatRow(copy.labels.selectedReminder, selectedReminder));
  }
  if (grant.categories.includes('selectedWellness') && selectedWellness) {
    lines.push(copy.formatRow(copy.labels.selectedWellness, selectedWellness));
  }
  lines.push(copy.footer);
  const summary = lines.join('\n');

  return Object.freeze({
    summary,
    // The QR renderer receives the reviewed text directly. No remote QR service
    // is permitted because that would disclose the selected health summary.
    qrPayload: summary,
    shareText: summary,
  });
}
