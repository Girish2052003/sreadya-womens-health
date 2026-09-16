import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';

import healthObservationSchema from '../../../../shared/schemas/v1/health-observation.schema.json';
import periodEpisodeSchema from '../../../../shared/schemas/v1/period-episode.schema.json';

function createAjv() {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  ajv.addFormat('date-time', {
    type: 'string',
    validate: (value: string) => Number.isFinite(Date.parse(value)),
  });
  return ajv;
}

describe('shared cycle schema conformance', () => {
  it('validates serialized synthetic period episodes with JSON Schema 2020-12', () => {
    const ajv = createAjv();
    const validate = ajv.compile(periodEpisodeSchema);
    const serialized = JSON.parse(JSON.stringify({
      id: 'period-ajv-1',
      start: '2026-09-10T00:00:00.000Z',
      end: '2026-09-12T00:00:00.000Z',
      source: 'cycleVault',
      externalId: 'synthetic-period',
    }));

    expect(validate(serialized), JSON.stringify(validate.errors)).toBe(true);
    expect(validate({ ...serialized, start: '2026-09-10T03:00:00+03:00' })).toBe(false);
    expect(validate({ ...serialized, source: 'remoteApi' })).toBe(false);
    expect(validate({ ...serialized, unexpectedHealthField: 'forbidden' })).toBe(false);
  });

  it('validates serialized synthetic observations with JSON Schema 2020-12', () => {
    const ajv = createAjv();
    const validate = ajv.compile(healthObservationSchema);
    const serialized = JSON.parse(JSON.stringify({
      id: 'observation-ajv-1',
      kind: 'cramps',
      occurredAt: '2026-09-16T08:00:00.000Z',
      severity: 'moderate',
      note: 'synthetic fixture only',
      source: 'healthConnect',
      externalId: 'synthetic-observation',
    }));

    expect(validate(serialized), JSON.stringify(validate.errors)).toBe(true);
    expect(validate({ ...serialized, kind: 'inventedSymptom' })).toBe(false);
    expect(validate({ ...serialized, occurredAt: '2026-09-16T11:00:00+03:00' })).toBe(false);
    expect(validate({ ...serialized, source: 'remoteApi' })).toBe(false);
    expect(validate({ ...serialized, severity: 'catastrophic' })).toBe(false);
    expect(validate({ ...serialized, unexpectedHealthField: 'forbidden' })).toBe(false);
  });
});
