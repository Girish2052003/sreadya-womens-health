import 'cycle_prediction.dart';

class PredictionOutcome {
  const PredictionOutcome({
    required this.prediction,
    required this.actualStart,
  });

  final CyclePrediction prediction;
  final DateTime actualStart;

  int get signedErrorDays => _date(actualStart)
      .difference(_date(prediction.mostLikelyDate))
      .inDays;

  int get absoluteErrorDays => signedErrorDays.abs();

  bool get withinWindow {
    final actual = _date(actualStart);
    return !actual.isBefore(_date(prediction.windowStart)) &&
        !actual.isAfter(_date(prediction.windowEnd));
  }

  static DateTime _date(DateTime value) =>
      DateTime(value.year, value.month, value.day);
}

class PredictionEvaluation {
  const PredictionEvaluation({
    required this.sampleCount,
    required this.meanAbsoluteErrorDays,
    required this.medianAbsoluteErrorDays,
    required this.windowCoverage,
    required this.earlyBiasDays,
    required this.lateBiasDays,
  });

  final int sampleCount;
  final double meanAbsoluteErrorDays;
  final double medianAbsoluteErrorDays;
  final double windowCoverage;
  final double earlyBiasDays;
  final double lateBiasDays;
}

class PredictionEvaluator {
  const PredictionEvaluator();

  PredictionEvaluation evaluate(List<PredictionOutcome> outcomes) {
    if (outcomes.isEmpty) {
      return const PredictionEvaluation(
        sampleCount: 0,
        meanAbsoluteErrorDays: 0,
        medianAbsoluteErrorDays: 0,
        windowCoverage: 0,
        earlyBiasDays: 0,
        lateBiasDays: 0,
      );
    }

    final absolute = outcomes
        .map((value) => value.absoluteErrorDays.toDouble())
        .toList(growable: false);
    final signed = outcomes
        .map((value) => value.signedErrorDays.toDouble())
        .toList(growable: false);
    final early = signed.where((value) => value < 0).map((value) => value.abs()).toList();
    final late = signed.where((value) => value > 0).toList();

    return PredictionEvaluation(
      sampleCount: outcomes.length,
      meanAbsoluteErrorDays: absolute.reduce((a, b) => a + b) / absolute.length,
      medianAbsoluteErrorDays: _median(absolute),
      windowCoverage: outcomes.where((value) => value.withinWindow).length / outcomes.length,
      earlyBiasDays: early.isEmpty ? 0 : early.reduce((a, b) => a + b) / early.length,
      lateBiasDays: late.isEmpty ? 0 : late.reduce((a, b) => a + b) / late.length,
    );
  }

  double _median(List<double> values) {
    final sorted = [...values]..sort();
    final middle = sorted.length ~/ 2;
    if (sorted.length.isOdd) return sorted[middle];
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
}
