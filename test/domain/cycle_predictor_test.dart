import 'package:flutter_test/flutter_test.dart';
import 'package:sreva/features/predictions/domain/cycle_predictor.dart';

void main() {
  group('CyclePredictor prediction-v1', () {
    test('predicts a stable 28 day cycle with high confidence', () {
      final predictor = CyclePredictor();
      final starts = <DateTime>[
        DateTime(2026, 1, 1),
        DateTime(2026, 1, 29),
        DateTime(2026, 2, 26),
        DateTime(2026, 3, 26),
        DateTime(2026, 4, 23),
        DateTime(2026, 5, 21),
        DateTime(2026, 6, 18),
        DateTime(2026, 7, 16),
      ];

      final prediction = predictor.predict(starts)!;

      expect(prediction.algorithmVersion, 'prediction-v1');
      expect(prediction.estimatedCycleLengthDays, 28);
      expect(prediction.mostLikelyDate, DateTime(2026, 8, 13));
      expect(prediction.windowStart, DateTime(2026, 8, 11));
      expect(prediction.windowEnd, DateTime(2026, 8, 15));
      expect(prediction.confidence, PredictionConfidence.high);
    });

    test('excludes biologically implausible intervals from estimator', () {
      final predictor = CyclePredictor();
      final starts = <DateTime>[
        DateTime(2026, 1, 1),
        DateTime(2026, 1, 29),
        DateTime(2026, 1, 30), // 1 day interval excluded
        DateTime(2026, 2, 27),
        DateTime(2026, 3, 27),
      ];

      final prediction = predictor.predict(starts)!;
      expect(
        prediction.validIntervals.every((v) => v >= 15 && v <= 90),
        isTrue,
      );
      expect(prediction.excludedIntervals, contains(1));
    });

    test('returns null with fewer than two period starts', () {
      final predictor = CyclePredictor();
      expect(predictor.predict([DateTime(2026, 1, 1)]), isNull);
    });

    test('widens uncertainty when history is sparse and variable', () {
      final predictor = CyclePredictor();
      final prediction = predictor.predict(<DateTime>[
        DateTime(2026, 1, 1),
        DateTime(2026, 1, 26),
        DateTime(2026, 3, 2),
        DateTime(2026, 3, 29),
      ])!;
      expect(
        prediction.windowEnd.difference(prediction.windowStart).inDays,
        greaterThanOrEqualTo(4),
      );
      expect(prediction.confidence, isNot(PredictionConfidence.high));
    });
  });
}
