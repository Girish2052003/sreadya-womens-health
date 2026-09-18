export type DiagnosticIntegrityCode =
  | 'vault_record_auth_failed'
  | 'migration_failed'
  | 'storage_pressure'
  | 'schema_unsupported'
  | 'key_unavailable'
  | 'unknown';

export type DiagnosticTechnicalInput = {
  appVersion: string;
  predictionEngine: string;
  reminderEngine: string;
  healthAdapter: string;
  lastMigration: string;
  browser: { name: string; version: string };
  schema: { vaultVersion: number; supported: boolean };
  engine: {
    crypto: 'webcrypto' | 'unavailable';
    persistence: 'indexeddb' | 'memory' | 'unavailable';
  };
  permissions: {
    notifications: 'granted' | 'denied' | 'default' | 'unsupported';
    persistentStorage: 'granted' | 'denied' | 'unknown' | 'unsupported';
  };
  integrity: {
    state: 'ok' | 'degraded' | 'failed';
    code?: DiagnosticIntegrityCode;
  };
};

export type DiagnosticReport = DiagnosticTechnicalInput & {
  format: 'SREVA-DIAGNOSTIC';
  version: 1;
};

const CRYPTO_ENGINES = new Set(['webcrypto', 'unavailable']);
const PERSISTENCE_ENGINES = new Set(['indexeddb', 'memory', 'unavailable']);
const NOTIFICATION_PERMISSIONS = new Set(['granted', 'denied', 'default', 'unsupported']);
const STORAGE_PERMISSIONS = new Set(['granted', 'denied', 'unknown', 'unsupported']);
const INTEGRITY_STATES = new Set(['ok', 'degraded', 'failed']);
const INTEGRITY_CODES = new Set<DiagnosticIntegrityCode>([
  'vault_record_auth_failed','migration_failed','storage_pressure','schema_unsupported','key_unavailable','unknown',
]);

function isTechnicalString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength && !/[\r\n\0]/u.test(value);
}
function fail(): never { throw new Error('Unsupported Sreva diagnostic technical state.'); }

export function buildDiagnosticReport(input: DiagnosticTechnicalInput): DiagnosticReport {
  const candidate = input as DiagnosticTechnicalInput;
  for (const value of [candidate?.appVersion, candidate?.predictionEngine, candidate?.reminderEngine, candidate?.healthAdapter, candidate?.lastMigration]) {
    if (!isTechnicalString(value, 96)) fail();
  }
  if (!isTechnicalString(candidate?.browser?.name, 80) || !isTechnicalString(candidate?.browser?.version, 80)) fail();
  if (!Number.isInteger(candidate?.schema?.vaultVersion) || candidate.schema.vaultVersion < 1) fail();
  if (typeof candidate?.schema?.supported !== 'boolean') fail();
  if (!CRYPTO_ENGINES.has(candidate?.engine?.crypto) || !PERSISTENCE_ENGINES.has(candidate?.engine?.persistence)) fail();
  if (!NOTIFICATION_PERMISSIONS.has(candidate?.permissions?.notifications) || !STORAGE_PERMISSIONS.has(candidate?.permissions?.persistentStorage)) fail();
  if (!INTEGRITY_STATES.has(candidate?.integrity?.state)) fail();
  if (candidate.integrity.code !== undefined && !INTEGRITY_CODES.has(candidate.integrity.code)) fail();

  return {
    format: 'SREVA-DIAGNOSTIC', version: 1,
    appVersion: candidate.appVersion,
    predictionEngine: candidate.predictionEngine,
    reminderEngine: candidate.reminderEngine,
    healthAdapter: candidate.healthAdapter,
    lastMigration: candidate.lastMigration,
    browser: { name: candidate.browser.name, version: candidate.browser.version },
    schema: { vaultVersion: candidate.schema.vaultVersion, supported: candidate.schema.supported },
    engine: { crypto: candidate.engine.crypto, persistence: candidate.engine.persistence },
    permissions: { notifications: candidate.permissions.notifications, persistentStorage: candidate.permissions.persistentStorage },
    integrity: candidate.integrity.code ? { state: candidate.integrity.state, code: candidate.integrity.code } : { state: candidate.integrity.state },
  };
}
