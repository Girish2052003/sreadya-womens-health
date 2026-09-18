import 'package:flutter_test/flutter_test.dart';
import 'package:sreadya/features/predictions/domain/cycle_prediction.dart';
import 'package:sreadya/features/predictions/domain/prediction_history.dart';

CyclePrediction prediction({required PredictionConfidence confidence}) =>
    CyclePrediction(
      algorithmVersion: 'prediction-v1',
      mostLikelyDate: DateTime(2026, 9, 20),
      windowStart: DateTime(2026, 9, 18),
      windowEnd: DateTime(2026, 9, 22),
      estimatedCycleLengthDays: 29,
      confidence: confidence,
      validIntervals: const [29, 29, 28, 30, 29, 29],
      excludedIntervals: const [],
      medianAbsoluteDeviation: 1,
      createdAt: DateTime(2026, 9, 1),
    );

void main() {
  test('evaluates absolute error and prediction-window coverage', () {
    final result = PredictionEvaluator().evaluate([
      PredictionOutcome(
        prediction: prediction(confidence: PredictionConfidence.high),
        actualStart: DateTime(2026, 9, 21),
      ),
    ]);

    expect(result.meanAbsoluteErrorDays, 1);
    expect(result.medianAbsoluteErrorDays, 1);
    expect(result.windowCoverage, 1);
    expect(result.lateBiasDays, 1);
    expect(result.overConfidenceRate, 0);
  });

  test('reports over-confidence and under-confidence calibration signals', () {
    final result = PredictionEvaluator().evaluate([
      PredictionOutcome(
        prediction: prediction(confidence: PredictionConfidence.high),
        actualStart: DateTime(2026, 9, 27),
      ),
      PredictionOutcome(
        prediction: prediction(confidence: PredictionConfidence.low),
        actualStart: DateTime(2026, 9, 20),
      ),
    ]);

    expect(result.overConfidenceRate, 1);
    expect(result.underConfidenceRate, 1);
  });
}
