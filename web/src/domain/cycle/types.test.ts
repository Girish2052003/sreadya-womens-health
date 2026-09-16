import { expect, test } from 'vitest';

import { OBSERVATION_KINDS, RECORD_SOURCES } from './types';

const expectedObservationKinds = [
  'menstrualFlow', 'cramps', 'headache', 'migraine', 'backPain',
  'breastTenderness', 'bloating', 'acne', 'nausea', 'digestion',
  'fatigue', 'dizziness', 'appetite', 'cravings', 'sleep', 'energy',
  'stress', 'mood', 'anxiety', 'irritability', 'libido',
  'vaginalDischarge', 'cervicalMucus', 'basalBodyTemperature', 'weight',
  'exercise', 'water', 'custom', 'ovulationTest', 'pregnancyTest',
  'sexualActivity', 'protection', 'contraception', 'medication',
  'supplement', 'dailyNote',
] as const;

test('freezes the canonical observation kinds and record provenance values', () => {
  expect(OBSERVATION_KINDS).toEqual(expectedObservationKinds);
  expect(RECORD_SOURCES).toEqual(['app', 'healthKit', 'healthConnect', 'cycleVault']);
});
