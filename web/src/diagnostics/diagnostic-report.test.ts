import { describe, expect, it } from 'vitest';

import { buildDiagnosticReport } from './diagnostic-report';

const versions = {
  predictionEngine: 'prediction-v1',
  reminderEngine: 'reminder-v1',
  healthAdapter: 'web-manual-v1',
  lastMigration: 'schema-v1-no-migration-required',
};

describe('buildDiagnosticReport', () => {
  it('emits only reviewed technical state and drops reproductive-health payload sentinels', () => {
    const report = buildDiagnosticReport({
      appVersion: '0.1.0',
      ...versions,
      browser: { name: 'Chromium', version: '153' },
      schema: { vaultVersion: 1, supported: true },
      engine: { crypto: 'webcrypto', persistence: 'indexeddb' },
      permissions: { notifications: 'default', persistentStorage: 'unknown' },
      integrity: { state: 'degraded', code: 'storage_pressure' },
      periodStart: '2099-12-31-SENTINEL',
      symptoms: ['SYMPTOM-SENTINEL'],
      notes: 'NOTE-SENTINEL',
      sexualActivity: 'SEXUAL-SENTINEL',
      fertility: 'FERTILITY-SENTINEL',
      pregnancy: 'PREGNANCY-SENTINEL',
    } as never);

    expect(report).toEqual({
      format: 'SREADYA-DIAGNOSTIC', version: 1, appVersion: '0.1.0', ...versions,
      browser: { name: 'Chromium', version: '153' },
      schema: { vaultVersion: 1, supported: true },
      engine: { crypto: 'webcrypto', persistence: 'indexeddb' },
      permissions: { notifications: 'default', persistentStorage: 'unknown' },
      integrity: { state: 'degraded', code: 'storage_pressure' },
    });

    const serialized = JSON.stringify(report);
    for (const forbidden of ['2099-12-31-SENTINEL','SYMPTOM-SENTINEL','NOTE-SENTINEL','SEXUAL-SENTINEL','FERTILITY-SENTINEL','PREGNANCY-SENTINEL','periodStart','symptoms','notes','sexualActivity','fertility','pregnancy']) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it('fails closed on unsupported technical enum values instead of reflecting them', () => {
    expect(() => buildDiagnosticReport({
      appVersion: '0.1.0', ...versions,
      browser: { name: 'Chromium', version: '153' },
      schema: { vaultVersion: 1, supported: true },
      engine: { crypto: 'made-up-crypto', persistence: 'indexeddb' },
      permissions: { notifications: 'default', persistentStorage: 'unknown' },
      integrity: { state: 'ok' },
    } as never)).toThrow('Unsupported Sreadya diagnostic technical state.');
  });
});
