enum LifeStageMode {
  cycleTracking,
  tryingToConceive,
  pregnancy,
  postpartum,
  breastfeeding,
  perimenopause,
  menopauseTransition,
  hormonalContraception,
}

extension LifeStageModeLabel on LifeStageMode {
  String get label => switch (this) {
    LifeStageMode.cycleTracking => 'Cycle tracking',
    LifeStageMode.tryingToConceive => 'Trying to conceive',
    LifeStageMode.pregnancy => 'Pregnancy',
    LifeStageMode.postpartum => 'Postpartum',
    LifeStageMode.breastfeeding => 'Breastfeeding',
    LifeStageMode.perimenopause => 'Perimenopause',
    LifeStageMode.menopauseTransition => 'Menopause transition',
    LifeStageMode.hormonalContraception => 'Hormonal contraception',
  };
}

class LifeStageCapabilities {
  const LifeStageCapabilities({
    required this.predictNextPeriod,
    required this.showFertilityObservations,
    required this.showPregnancyLogging,
    required this.preserveHistoricalCycles,
    required this.claimsContraceptiveEffectiveness,
  });

  final bool predictNextPeriod;
  final bool showFertilityObservations;
  final bool showPregnancyLogging;
  final bool preserveHistoricalCycles;
  final bool claimsContraceptiveEffectiveness;

  factory LifeStageCapabilities.forMode(LifeStageMode mode) {
    return switch (mode) {
      LifeStageMode.pregnancy => const LifeStageCapabilities(
        predictNextPeriod: false,
        showFertilityObservations: false,
        showPregnancyLogging: true,
        preserveHistoricalCycles: true,
        claimsContraceptiveEffectiveness: false,
      ),
      LifeStageMode.tryingToConceive => const LifeStageCapabilities(
        predictNextPeriod: true,
        showFertilityObservations: true,
        showPregnancyLogging: false,
        preserveHistoricalCycles: true,
        claimsContraceptiveEffectiveness: false,
      ),
      LifeStageMode.postpartum ||
      LifeStageMode.breastfeeding => const LifeStageCapabilities(
        predictNextPeriod: false,
        showFertilityObservations: false,
        showPregnancyLogging: false,
        preserveHistoricalCycles: true,
        claimsContraceptiveEffectiveness: false,
      ),
      LifeStageMode.menopauseTransition => const LifeStageCapabilities(
        predictNextPeriod: false,
        showFertilityObservations: false,
        showPregnancyLogging: false,
        preserveHistoricalCycles: true,
        claimsContraceptiveEffectiveness: false,
      ),
      LifeStageMode.cycleTracking ||
      LifeStageMode.perimenopause ||
      LifeStageMode.hormonalContraception => const LifeStageCapabilities(
        predictNextPeriod: true,
        showFertilityObservations: false,
        showPregnancyLogging: false,
        preserveHistoricalCycles: true,
        claimsContraceptiveEffectiveness: false,
      ),
    };
  }
}
