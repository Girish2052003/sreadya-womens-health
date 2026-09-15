import 'package:flutter_test/flutter_test.dart';
import 'package:sreva/features/predictions/domain/cycle_prediction.dart';
import 'package:sreva/features/predictions/domain/prediction_history.dart';

void main() {
  test('evaluates absolute error and prediction-window coverage', () {
    final prediction = CyclePrediction(
      algorithmVersion: 'prediction-v1',
      mostLikelyDate: DateTime(2026, 9, 20),
      windowStart: DateTime(2026, 9, 18),
      windowEnd: DateTime(2026, 9, 22),
      estimatedCycleLengthDays: 29,
      confidence: PredictionConfidence.high,
      validIntervals: const [29, 29, 28, 30, 29, 29],
      excludedIntervals: const [],
      medianAbsoluteDeviation: 1,
      createdAt: DateTime(2026, 9, 1),
    );

    final result = PredictionEvaluator().evaluate(
      [PredictionOutcome(prediction: prediction, actualStart: DateTime(2026, 9, 21))],
    );

    expect(result.meanAbsoluteErrorDays, 1);
    expect(result.medianAbsoluteErrorDays, 1);
    expect(result.windowCoverage, 1);
    expect(result.lateBiasDays, 1);
  });
}
