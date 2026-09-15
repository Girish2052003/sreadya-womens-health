import 'dart:math' as math;

import '../../cycle/domain/cycle_models.dart';
import '../../predictions/domain/prediction_history.dart';

class CycleSummary {
  const CycleSummary({
    required this.averageLength,
    required this.shortestLength,
    required this.longestLength,
    required this.standardDeviation,
  });

  final double averageLength;
  final int shortestLength;
  final int longestLength;
  final double standardDeviation;
}

class InsightSnapshot {
  const InsightSnapshot({
    required this.cycleSummary,
    required this.averagePeriodDurationDays,
    required this.flowCounts,
    required this.observationCounts,
    required this.observationalMessages,
    this.predictionEvaluation,
  });

  final CycleSummary? cycleSummary;
  final double? averagePeriodDurationDays;
  final Map<FlowLevel, int> flowCounts;
  final Map<ObservationKind, int> observationCounts;
  final List<String> observationalMessages;
  final PredictionEvaluation? predictionEvaluation;
}

class InsightEngine {
  CycleSummary? summarizeCycleLengths(List<int> lengths) {
    if (lengths.isEmpty) return null;
    final average = lengths.reduce((a, b) => a + b) / lengths.length;
    final variance = lengths
            .map((v) => math.pow(v - average, 2).toDouble())
            .reduce((a, b) => a + b) /
        lengths.length;
    return CycleSummary(
      averageLength: average,
      shortestLength: lengths.reduce(math.min),
      longestLength: lengths.reduce(math.max),
      standardDeviation: math.sqrt(variance),
    );
  }

  InsightSnapshot summarize({
    required List<PeriodEpisode> periods,
    required List<HealthObservation> observations,
    PredictionEvaluation? predictionEvaluation,
  }) {
    final ordered = [...periods]..sort((a, b) => a.start.compareTo(b.start));
    final cycleLengths = <int>[];
    for (var i = 1; i < ordered.length; i++) {
      final days = _date(ordered[i].start).difference(_date(ordered[i - 1].start)).inDays;
      if (days >= 15 && days <= 90) cycleLengths.add(days);
    }

    final completedDurations = ordered.map((item) => item.durationDays).whereType<int>().where((value) => value > 0).toList();
    final averageDuration = completedDurations.isEmpty
        ? null
        : completedDurations.reduce((a, b) => a + b) / completedDurations.length;

    final flowCounts = <FlowLevel, int>{};
    final observationCounts = <ObservationKind, int>{};
    for (final observation in observations) {
      observationCounts.update(observation.kind, (value) => value + 1, ifAbsent: () => 1);
      final flow = observation.flowLevel;
      if (flow != null) flowCounts.update(flow, (value) => value + 1, ifAbsent: () => 1);
    }

    final messages = <String>[];
    final timingKinds = <ObservationKind, String>{
      ObservationKind.cramps: 'Cramps',
      ObservationKind.headache: 'Headaches',
      ObservationKind.migraine: 'Migraines',
      ObservationKind.mood: 'Mood observations',
      ObservationKind.sleep: 'Sleep observations',
      ObservationKind.energy: 'Energy observations',
      ObservationKind.stress: 'Stress observations',
    };
    for (final entry in timingKinds.entries) {
      final days = _cycleDaysFor(entry.key, ordered, observations);
      if (days.length >= 2) {
        messages.add(symptomTimingInsight(symptomLabel: entry.value, cycleDays: days));
      }
    }
    if (flowCounts.isNotEmpty) {
      final top = flowCounts.entries.reduce((a, b) => a.value >= b.value ? a : b);
      messages.add('${_title(top.key.name)} flow was your most frequently recorded flow level (${top.value} logs). This is a summary of your entries, not a medical interpretation.');
    }

    return InsightSnapshot(
      cycleSummary: summarizeCycleLengths(cycleLengths),
      averagePeriodDurationDays: averageDuration,
      flowCounts: Map.unmodifiable(flowCounts),
      observationCounts: Map.unmodifiable(observationCounts),
      observationalMessages: List.unmodifiable(messages),
      predictionEvaluation: predictionEvaluation,
    );
  }

  String symptomTimingInsight({
    required String symptomLabel,
    required List<int> cycleDays,
  }) {
    if (cycleDays.isEmpty) {
      return '$symptomLabel has not been recorded often enough for a timing insight.';
    }
    final counts = <int, int>{};
    for (final day in cycleDays) {
      counts.update(day, (v) => v + 1, ifAbsent: () => 1);
    }
    final top = counts.entries.reduce((a, b) => a.value >= b.value ? a : b);
    return '$symptomLabel were recorded most often around cycle day ${top.key}. This is an observation, not a medical cause or diagnosis.';
  }

  List<int> _cycleDaysFor(
    ObservationKind kind,
    List<PeriodEpisode> periods,
    List<HealthObservation> observations,
  ) {
    if (periods.isEmpty) return const [];
    final result = <int>[];
    for (final observation in observations.where((item) => item.kind == kind)) {
      PeriodEpisode? latest;
      for (final period in periods) {
        if (!_date(period.start).isAfter(_date(observation.occurredAt))) latest = period;
      }
      if (latest == null) continue;
      final day = _date(observation.occurredAt).difference(_date(latest.start)).inDays + 1;
      if (day >= 1 && day <= 90) result.add(day);
    }
    return result;
  }

  DateTime _date(DateTime value) => DateTime(value.year, value.month, value.day);

  String _title(String value) => value.isEmpty ? value : '${value[0].toUpperCase()}${value.substring(1)}';
}
