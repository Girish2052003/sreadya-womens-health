import 'package:flutter_test/flutter_test.dart';
import 'package:sreva/features/life_stage/domain/life_stage.dart';

void main() {
  test('pregnancy mode suppresses cycle prediction without deleting cycle history capability', () {
    final capabilities = LifeStageCapabilities.forMode(LifeStageMode.pregnancy);
    expect(capabilities.predictNextPeriod, isFalse);
    expect(capabilities.showPregnancyLogging, isTrue);
    expect(capabilities.preserveHistoricalCycles, isTrue);
  });

  test(
    'TTC enables fertility observations but does not make contraception claims',
    () {
      final capabilities = LifeStageCapabilities.forMode(
        LifeStageMode.tryingToConceive,
      );
      expect(capabilities.showFertilityObservations, isTrue);
      expect(capabilities.claimsContraceptiveEffectiveness, isFalse);
    },
  );
}
