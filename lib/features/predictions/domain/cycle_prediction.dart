enum PredictionConfidence { low, medium, high }

class CyclePrediction {
  const CyclePrediction({
    required this.algorithmVersion,
    required this.createdAt,
    required this.estimatedCycleLengthDays,
    required this.mostLikelyDate,
    required this.windowStart,
    required this.windowEnd,
    required this.confidence,
    required this.validIntervals,
    required this.excludedIntervals,
    required this.medianAbsoluteDeviation,
    this.estimatedPeriodDurationDays,
  });

  final String algorithmVersion;
  final DateTime createdAt;
  final int estimatedCycleLengthDays;
  final int? estimatedPeriodDurationDays;
  final DateTime mostLikelyDate;
  final DateTime windowStart;
  final DateTime windowEnd;
  final PredictionConfidence confidence;
  final List<int> validIntervals;
  final List<int> excludedIntervals;
  final double medianAbsoluteDeviation;
}
