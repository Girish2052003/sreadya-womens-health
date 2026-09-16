import type { VaultService } from '../../vault/vault-service';
import {
  PARTNER_SHARE_CATEGORIES,
  type PartnerGrant,
  type PartnerShareCategory,
} from './partner-sharing';

const PARTNER_GRANTS_ID = 'sharing:partner-grants:v1';

function isUtcTimestamp(value: unknown): value is string {
  return typeof value === 'string'
    && value.endsWith('Z')
    && Number.isFinite(Date.parse(value));
}

function isCategory(value: unknown): value is PartnerShareCategory {
  return typeof value === 'string'
    && (PARTNER_SHARE_CATEGORIES as readonly string[]).includes(value);
}

function isGrant(value: unknown): value is PartnerGrant {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.id !== 'string' || candidate.id.trim().length === 0) return false;
  if (!Array.isArray(candidate.categories) || candidate.categories.length === 0) return false;
  if (!candidate.categories.every(isCategory)) return false;
  if (!isUtcTimestamp(candidate.createdAt)) return false;
  if (candidate.revokedAt !== undefined && !isUtcTimestamp(candidate.revokedAt)) return false;
  if (
    typeof candidate.revokedAt === 'string'
    && Date.parse(candidate.revokedAt) < Date.parse(candidate.createdAt as string)
  ) return false;
  return true;
}

function validateGrant(value: unknown): asserts value is PartnerGrant {
  if (!isGrant(value)) throw new Error('Invalid partner grant.');
}

export class PartnerGrantRepository {
  constructor(private readonly vault: VaultService) {}

  async list(): Promise<PartnerGrant[]> {
    const ids = await this.vault.listRecordIds();
    if (!ids.includes(PARTNER_GRANTS_ID)) return [];

    const stored = await this.vault.read<unknown>(PARTNER_GRANTS_ID);
    if (!Array.isArray(stored)) throw new Error('Invalid partner grant.');
    stored.forEach(validateGrant);
    return stored
      .map((grant) => ({ ...grant, categories: [...grant.categories] }))
      .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
  }

  async save(grant: PartnerGrant): Promise<void> {
    validateGrant(grant);
    const existing = await this.list();
    const next = existing.filter((candidate) => candidate.id !== grant.id);
    next.push({ ...grant, categories: [...grant.categories] });
    next.sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
    await this.vault.write(PARTNER_GRANTS_ID, next);
  }
}
