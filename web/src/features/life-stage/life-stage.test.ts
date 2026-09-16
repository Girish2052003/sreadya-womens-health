import { describe, expect, it } from 'vitest';

import {
  LIFE_STAGE_CAPABILITY_IDS,
  LIFE_STAGE_MODES,
  capabilitiesForLifeStage,
  lifeStageLabel,
} from './life-stage';

describe('Task 13 life-stage parity', () => {
  it('covers all eight authoritative modes and LIFE-001 through LIFE-009', () => {
    expect(LIFE_STAGE_MODES).toEqual([
      'cycleTracking',
      'tryingToConceive',
      'pregnancy',
      'postpartum',
      'breastfeeding',
      'perimenopause',
      'menopauseTransition',
      'hormonalContraception',
    ]);
    expect(LIFE_STAGE_CAPABILITY_IDS).toEqual([
      'LIFE-001', 'LIFE-002', 'LIFE-003', 'LIFE-004', 'LIFE-005',
      'LIFE-006', 'LIFE-007', 'LIFE-008', 'LIFE-009',
    ]);
    expect(LIFE_STAGE_MODES.map(lifeStageLabel)).toEqual([
      'Cycle tracking',
      'Trying to conceive',
      'Pregnancy',
      'Postpartum',
      'Breastfeeding',
      'Perimenopause',
      'Menopause transition',
      'Hormonal contraception',
    ]);
  });

  it('preserves history in every mode and never claims contraceptive effectiveness', () => {
    for (const mode of LIFE_STAGE_MODES) {
      const capabilities = capabilitiesForLifeStage(mode);
      expect(capabilities.preserveHistoricalCycles).toBe(true);
      expect(capabilities.claimsContraceptiveEffectiveness).toBe(false);
    }

    expect(capabilitiesForLifeStage('pregnancy')).toMatchObject({
      predictNextPeriod: false,
      showFertilityObservations: false,
      showPregnancyLogging: true,
    });
    expect(capabilitiesForLifeStage('tryingToConceive')).toMatchObject({
      predictNextPeriod: true,
      showFertilityObservations: true,
      showPregnancyLogging: false,
    });
    expect(capabilitiesForLifeStage('postpartum').predictNextPeriod).toBe(false);
    expect(capabilitiesForLifeStage('breastfeeding').predictNextPeriod).toBe(false);
    expect(capabilitiesForLifeStage('menopauseTransition').predictNextPeriod).toBe(false);
  });
});
