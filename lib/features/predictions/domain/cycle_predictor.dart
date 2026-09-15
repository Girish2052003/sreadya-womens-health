import 'dart:math' as math;

import 'cycle_prediction.dart';

class CyclePredictor {
  static const String algorithmVersion = 'prediction-v1';

  CyclePrediction? predict(List<DateTime> periodStarts, {DateTime? createdAt}) {
    if (periodStarts.length < 2) return null;

    final ordered = periodStarts
        .map((d) => DateTime(d.year, d.month, d.day))
        .toList(growable: false)
      ..sort();

    final allIntervals = <int>[];
    for (var i = 1; i < ordered.length; i++) {
      allIntervals.add(ordered[i].difference(ordered[i - 1]).inDays);
    }

    final excluded = allIntervals.where((v) => v < 15 || v > 90).toList(growable: false);
    final filtered = allIntervals.where((v) => v >= 15 && v <= 90).toList();
    if (filtered.isEmpty) return null;

    final valid = filtered.length <= 12
        ? filtered
        : filtered.sublist(filtered.length - 12);

    final med = _median(valid.map((e) => e.toDouble()).toList());
    var weightedTotal = 0.0;
    var totalWeight = 0.0;
    for (var i = 0; i < valid.length; i++) {
      final weight = (i + 1).toDouble();
      weightedTotal += valid[i] * weight;
      totalWeight += weight;
    }
    final weightedMean = weightedTotal / totalWeight;
    final estimate = ((med + weightedMean) / 2).round();

    final deviations = valid.map((v) => (v - med).abs()).toList(growable: false);
    final mad = _median(deviations);
    final dataPenalty = valid.length < 4 ? 2 : (valid.length <= 5 ? 1 : 0);
    final rawHalfWidth = math.max(2.0, 1.5 * mad + dataPenalty).round();
    final halfWidth = rawHalfWidth.clamp(2, 10);

    final confidence = valid.length >= 6 && mad <= 2
        ? PredictionConfidence.high
        : valid.length >= 3 && mad <= 5
            ? PredictionConfidence.medium
            : PredictionConfidence.low;

    final latest = ordered.last;
    final likely = latest.add(Duration(days: estimate));
    return CyclePrediction(
      algorithmVersion: algorithmVersion,
      createdAt: createdAt ?? DateTime.now(),
      estimatedCycleLengthDays: estimate,
      mostLikelyDate: likely,
      windowStart: likely.subtract(Duration(days: halfWidth)),
      windowEnd: likely.add(Duration(days: halfWidth)),
      confidence: confidence,
      validIntervals: List.unmodifiable(valid),
      excludedIntervals: List.unmodifiable(excluded),
      medianAbsoluteDeviation: mad,
    );
  }

  double _median(List<double> values) {
    final sorted = [...values]..sort();
    final middle = sorted.length ~/ 2;
    if (sorted.length.isOdd) return sorted[middle];
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
}
