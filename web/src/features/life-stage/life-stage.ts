export const LIFE_STAGE_MODES = [
  'cycleTracking',
  'tryingToConceive',
  'pregnancy',
  'postpartum',
  'breastfeeding',
  'perimenopause',
  'menopauseTransition',
  'hormonalContraception',
] as const;

export type LifeStageMode = (typeof LIFE_STAGE_MODES)[number];

export const LIFE_STAGE_CAPABILITY_IDS = [
  'LIFE-001',
  'LIFE-002',
  'LIFE-003',
  'LIFE-004',
  'LIFE-005',
  'LIFE-006',
  'LIFE-007',
  'LIFE-008',
  'LIFE-009',
] as const;

export type LifeStageCapabilities = {
  predictNextPeriod: boolean;
  showFertilityObservations: boolean;
  showPregnancyLogging: boolean;
  preserveHistoricalCycles: true;
  claimsContraceptiveEffectiveness: false;
};

const LABELS: Record<LifeStageMode, string> = {
  cycleTracking: 'Cycle tracking',
  tryingToConceive: 'Trying to conceive',
  pregnancy: 'Pregnancy',
  postpartum: 'Postpartum',
  breastfeeding: 'Breastfeeding',
  perimenopause: 'Perimenopause',
  menopauseTransition: 'Menopause transition',
  hormonalContraception: 'Hormonal contraception',
};

const BASE: Pick<LifeStageCapabilities, 'preserveHistoricalCycles' | 'claimsContraceptiveEffectiveness'> = {
  preserveHistoricalCycles: true,
  claimsContraceptiveEffectiveness: false,
};

export function lifeStageLabel(mode: LifeStageMode): string {
  return LABELS[mode];
}

export function capabilitiesForLifeStage(mode: LifeStageMode): LifeStageCapabilities {
  switch (mode) {
    case 'pregnancy':
      return {
        ...BASE,
        predictNextPeriod: false,
        showFertilityObservations: false,
        showPregnancyLogging: true,
      };
    case 'tryingToConceive':
      return {
        ...BASE,
        predictNextPeriod: true,
        showFertilityObservations: true,
        showPregnancyLogging: false,
      };
    case 'postpartum':
    case 'breastfeeding':
    case 'menopauseTransition':
      return {
        ...BASE,
        predictNextPeriod: false,
        showFertilityObservations: false,
        showPregnancyLogging: false,
      };
    case 'cycleTracking':
    case 'perimenopause':
    case 'hormonalContraception':
      return {
        ...BASE,
        predictNextPeriod: true,
        showFertilityObservations: false,
        showPregnancyLogging: false,
      };
  }
}
