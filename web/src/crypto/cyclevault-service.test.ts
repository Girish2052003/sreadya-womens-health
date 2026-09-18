import { describe, expect, it } from 'vitest';

import type { CycleVaultPayloadV1 } from './cyclevault';
import { openCycleVaultV1, sealCycleVaultV1 } from './cyclevault';
import { CycleVaultWebService } from './cyclevault-service';
import { HealthVaultRepository } from '../vault/health-repository';
import { VaultService } from '../vault/vault-service';
import type { PersistedVaultRecord, VaultPersistence } from '../vault/vault-types';

const PASSPHRASE = 'correct horse battery staple';
const FIXED_SALT = Uint8Array.from({ length: 16 }, (_, index) => index);
const FIXED_NONCE = Uint8Array.from({ length: 12 }, (_, index) => index + 16);
const CREATED_AT = new Date('2026-09-16T12:34:56.000Z');

class AtomicMemoryPersistence implements VaultPersistence {
  records = new Map<string, PersistedVaultRecord>();
  key: CryptoKey | null = null;
  failNextReplace = false;

  async getRecord(id: string) { return this.records.get(id); }
  async putRecord(record: PersistedVaultRecord) { this.records.set(record.id, structuredClone(record)); }
  async deleteRecord(id: string) { this.records.delete(id); }
  async listRecords() { return [...this.records.values()].map((value) => structuredClone(value)); }
  async getStoredKey() { return this.key; }
  async putStoredKey(key: CryptoKey) { this.key = key; }
  async replaceRecordsAtomically(removeIds: string[], replacements: PersistedVaultRecord[]) {
    const next = new Map([...this.records.entries()].map(([id, value]) => [id, structuredClone(value)]));
    for (const id of removeIds) next.delete(id);
    for (const record of replacements) next.set(record.id, structuredClone(record));
    if (this.failNextReplace) {
      this.failNextReplace = false;
      throw new Error('simulated restore transaction failure');
    }
    this.records = next;
  }
}

async function setup() {
  const persistence = new AtomicMemoryPersistence();
  const vault = new VaultService(persistence);
  await vault.createOrOpen();
  const repository = new HealthVaultRepository(vault);
  const service = new CycleVaultWebService(repository, {
    now: () => CREATED_AT,
    randomBytes: (count) => {
      if (count === 16) return new Uint8Array(FIXED_SALT);
      if (count === 12) return new Uint8Array(FIXED_NONCE);
      throw new Error(`unexpected random byte request: ${count}`);
    },
  });
  return { persistence, vault, repository, service };
}

function manifest() {
  return {
    format: 'SREADYA-CYCLEVAULT' as const,
    formatVersion: 1 as const,
    createdAtUtc: CREATED_AT.toISOString(),
    appVersion: '1.0.0',
    databaseSchema: 1,
    predictionEngine: 'prediction-v1',
    kdf: 'argon2id-m19MiB-t2-p1' as const,
    cipher: 'aes-256-gcm' as const,
  };
}

async function containerFor(payload: CycleVaultPayloadV1) {
  return sealCycleVaultV1({
    manifest: manifest(),
    payload,
    passphrase: PASSPHRASE,
    salt: FIXED_SALT,
    nonce: FIXED_NONCE,
  });
}

describe('CycleVaultWebService', () => {
  it('exports the exact mobile v1 manifest and payload field shape from the encrypted local repository', async () => {
    const { repository, service } = await setup();
    await repository.savePeriod({
      id: 'period-export',
      start: '2026-08-01T00:00:00.000Z',
      end: '2026-08-05T00:00:00.000Z',
      source: 'healthKit',
      externalId: 'hk-period-1',
    });
    await repository.saveObservation({
      id: 'observation-export',
      kind: 'cramps',
      occurredAt: '2026-08-02T08:15:00.000Z',
      severity: 'moderate',
      numericValue: 0,
      source: 'app',
    });

    const container = await service.exportContainer(PASSPHRASE);
    const outer = JSON.parse(container) as { manifest: Record<string, unknown> };
    expect(Object.keys(outer)).toEqual(['manifest', 'salt', 'sealedPayload']);
    expect(Object.keys(outer.manifest)).toEqual([
      'format', 'formatVersion', 'createdAtUtc', 'appVersion', 'databaseSchema',
      'predictionEngine', 'kdf', 'cipher',
    ]);
    expect(outer.manifest).toEqual(manifest());

    await expect(openCycleVaultV1(container, PASSPHRASE)).resolves.toEqual({
      periods: [{
        id: 'period-export',
        start: '2026-08-01T00:00:00.000Z',
        end: '2026-08-05T00:00:00.000Z',
        source: 'healthKit',
        externalId: 'hk-period-1',
      }],
      observations: [{
        id: 'observation-export',
        kind: 'cramps',
        occurredAt: '2026-08-02T08:15:00.000Z',
        severity: 'moderate',
        numericValue: 0,
        unit: null,
        label: null,
        note: null,
        flowLevel: null,
        source: 'app',
        externalId: null,
      }],
    });
  });

  it('restores only after validation, reclassifies imported provenance, and preserves unrelated encrypted preferences', async () => {
    const { vault, repository, service } = await setup();
    await repository.savePeriod({
      id: 'period-old',
      start: '2026-07-01T00:00:00.000Z',
      end: '2026-07-04T00:00:00.000Z',
      source: 'app',
    });
    await vault.write('preferences:reminders:v1', { enabledOffsetsDays: [3] });

    const container = await containerFor({
      periods: [{
        id: 'period-imported',
        start: '2026-09-01T00:00:00.000Z',
        end: '2026-09-05T00:00:00.000Z',
        source: 'healthKit',
        externalId: 'mobile-period',
      }],
      observations: [{
        id: 'observation-imported',
        kind: 'cramps',
        occurredAt: '2026-09-02T10:00:00.000Z',
        severity: 'severe',
        numericValue: null,
        unit: null,
        label: null,
        note: 'synthetic import',
        flowLevel: null,
        source: 'healthConnect',
        externalId: 'mobile-observation',
      }],
    });

    await expect(service.restoreContainer(container, PASSPHRASE)).resolves.toEqual({ periods: 1, observations: 1 });
    await expect(repository.listPeriods()).resolves.toEqual([{
      id: 'period-imported',
      start: '2026-09-01T00:00:00.000Z',
      end: '2026-09-05T00:00:00.000Z',
      source: 'cycleVault',
      externalId: 'mobile-period',
    }]);
    await expect(repository.listObservations()).resolves.toEqual([{
      id: 'observation-imported',
      kind: 'cramps',
      occurredAt: '2026-09-02T10:00:00.000Z',
      severity: 'severe',
      note: 'synthetic import',
      source: 'cycleVault',
      externalId: 'mobile-observation',
    }]);
    await expect(vault.read('preferences:reminders:v1')).resolves.toEqual({ enabledOffsetsDays: [3] });
  });

  it('rejects duplicate IDs and overlapping periods without changing the previous live health dataset', async () => {
    const { repository, service } = await setup();
    const live = {
      id: 'period-live',
      start: '2026-06-01T00:00:00.000Z',
      end: '2026-06-04T00:00:00.000Z',
      source: 'app' as const,
    };
    await repository.savePeriod(live);

    const duplicate = await containerFor({
      periods: [
        { id: 'duplicate', start: '2026-09-01T00:00:00.000Z', end: '2026-09-03T00:00:00.000Z', source: 'app', externalId: null },
        { id: 'duplicate', start: '2026-09-10T00:00:00.000Z', end: '2026-09-12T00:00:00.000Z', source: 'app', externalId: null },
      ],
      observations: [],
    });
    await expect(service.restoreContainer(duplicate, PASSPHRASE)).rejects.toThrow(/domain validation/i);
    await expect(repository.listPeriods()).resolves.toEqual([live]);

    const overlap = await containerFor({
      periods: [
        { id: 'period-a', start: '2026-09-01T00:00:00.000Z', end: '2026-09-05T00:00:00.000Z', source: 'app', externalId: null },
        { id: 'period-b', start: '2026-09-05T00:00:00.000Z', end: '2026-09-07T00:00:00.000Z', source: 'app', externalId: null },
      ],
      observations: [],
    });
    await expect(service.restoreContainer(overlap, PASSPHRASE)).rejects.toThrow(/domain validation/i);
    await expect(repository.listPeriods()).resolves.toEqual([live]);
  });

  it('rejects invalid restored enums and timestamps before replacement', async () => {
    const { repository, service } = await setup();
    const live = {
      id: 'observation-live',
      kind: 'dailyNote' as const,
      occurredAt: '2026-06-03T09:00:00.000Z',
      source: 'app' as const,
      note: 'keep me',
    };
    await repository.saveObservation(live);

    const invalid = await containerFor({
      periods: [],
      observations: [{
        id: 'observation-invalid',
        kind: 'inventedSymptom',
        occurredAt: '2026-09-02T10:00:00+03:00',
        severity: 'extreme',
        numericValue: null,
        unit: null,
        label: null,
        note: null,
        flowLevel: null,
        source: 'app',
        externalId: null,
      }],
    });

    await expect(service.restoreContainer(invalid, PASSPHRASE)).rejects.toThrow(/domain validation/i);
    await expect(repository.listObservations()).resolves.toEqual([live]);
  });

  it('preserves the previous live dataset when the atomic persistence transaction fails', async () => {
    const { persistence, repository, service } = await setup();
    const live = {
      id: 'period-live',
      start: '2026-05-01T00:00:00.000Z',
      end: '2026-05-04T00:00:00.000Z',
      source: 'app' as const,
    };
    await repository.savePeriod(live);
    const replacement = await containerFor({
      periods: [{
        id: 'period-new', start: '2026-09-01T00:00:00.000Z', end: '2026-09-04T00:00:00.000Z', source: 'app', externalId: null,
      }],
      observations: [],
    });

    persistence.failNextReplace = true;
    await expect(service.restoreContainer(replacement, PASSPHRASE)).rejects.toThrow('simulated restore transaction failure');
    await expect(repository.listPeriods()).resolves.toEqual([live]);
  });
});
