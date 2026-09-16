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

export type PartnerSharePackage = {
  summary: string;
  qrPayload: string;
  shareText: string;
};

function assertIsoTimestamp(value: string): void {
  if (!Number.isFinite(Date.parse(value)) || !value.endsWith('Z')) {
    throw new Error('Partner grant timestamp must be UTC.');
  }
}

function assertCategories(categories: readonly PartnerShareCategory[]): void {
  if (categories.length === 0) throw new Error('Select at least one partner-sharing category.');
  if (categories.some((category) => !(PARTNER_SHARE_CATEGORIES as readonly string[]).includes(category))) {
    throw new Error('Unsupported partner-sharing category.');
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
  if (!id.trim()) throw new Error('Partner grant id is required.');
  assertCategories(categories);
  assertIsoTimestamp(createdAt);
  return Object.freeze({ id, categories: Object.freeze([...new Set(categories)]), createdAt });
}

export function revokePartnerGrant(grant: PartnerGrant, revokedAt: string): PartnerGrant {
  assertIsoTimestamp(revokedAt);
  if (Date.parse(revokedAt) < Date.parse(grant.createdAt)) {
    throw new Error('Partner grant cannot be revoked before it was created.');
  }
  return Object.freeze({ ...grant, categories: Object.freeze([...grant.categories]), revokedAt });
}

export function buildPartnerSharePackage({
  grant,
  predictionWindow,
  cyclePhase,
  selectedReminder,
  selectedWellness,
}: { grant: PartnerGrant } & PartnerShareValues): PartnerSharePackage {
  if (grant.revokedAt) throw new Error('Partner grant is revoked.');
  assertCategories(grant.categories);

  const lines = ['Sreva shared summary'];
  if (grant.categories.includes('prediction') && predictionWindow) {
    lines.push(`Expected period window: ${predictionWindow}`);
  }
  if (grant.categories.includes('cyclePhase') && cyclePhase) {
    lines.push(`Cycle: ${cyclePhase}`);
  }
  if (grant.categories.includes('selectedReminder') && selectedReminder) {
    lines.push(`Reminder: ${selectedReminder}`);
  }
  if (grant.categories.includes('selectedWellness') && selectedWellness) {
    lines.push(`Wellness: ${selectedWellness}`);
  }
  lines.push('Shared intentionally by the Sreva user.');
  const summary = lines.join('\n');

  return Object.freeze({
    summary,
    // The QR renderer receives the reviewed text directly. No remote QR service
    // is permitted because that would disclose the selected health summary.
    qrPayload: summary,
    shareText: summary,
  });
}
