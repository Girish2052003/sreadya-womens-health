import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:sreva/features/predictions/domain/cycle_predictor.dart';

void main() {
  test('prediction-v1 matches every shared golden vector', () {
    final file = File(
      'shared/prediction/test-vectors/prediction-v1.json',
    );
    expect(file.existsSync(), isTrue, reason: 'shared prediction vectors missing');

    final payload = jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
    expect(payload['version'], 'prediction-v1');
    final cases = (payload['cases'] as List).cast<Map<String, dynamic>>();
    expect(cases, isNotEmpty);

    final predictor = CyclePredictor();
    for (final vector in cases) {
      final input = vector['input'] as Map<String, dynamic>;
      final starts = (input['periodStarts'] as List)
          .cast<String>()
          .map(DateTime.parse)
          .toList(growable: false);
      final durations = (input['completedPeriodDurations'] as List? ?? const [])
          .cast<num>()
          .map((value) => value.toInt())
          .toList(growable: false);
      final createdAt = input['createdAt'] == null
          ? null
          : DateTime.parse(input['createdAt'] as String);

      final actual = predictor.predict(
        starts,
        completedPeriodDurations: durations,
        createdAt: createdAt,
      );
      final expected = vector['expected'];
      if (expected == null) {
        expect(actual, isNull, reason: vector['id'] as String);
        continue;
      }

      final value = expected as Map<String, dynamic>;
      expect(actual, isNotNull, reason: vector['id'] as String);
      expect(actual!.algorithmVersion, value['algorithmVersion']);
      expect(
        actual.estimatedCycleLengthDays,
        value['estimatedCycleLengthDays'],
        reason: vector['id'] as String,
      );
      expect(
        actual.estimatedPeriodDurationDays,
        value['estimatedPeriodDurationDays'],
      );
      expect(_date(actual.mostLikelyDate), value['mostLikelyDate']);
      expect(_date(actual.windowStart), value['windowStart']);
      expect(_date(actual.windowEnd), value['windowEnd']);
      expect(actual.confidence.name, value['confidence']);
      expect(actual.validIntervals, value['validIntervals']);
      expect(actual.excludedIntervals, value['excludedIntervals']);
      expect(
        actual.medianAbsoluteDeviation,
        (value['medianAbsoluteDeviation'] as num).toDouble(),
      );
    }
  });
}

String _date(DateTime value) =>
    '${value.year.toString().padLeft(4, '0')}-'
    '${value.month.toString().padLeft(2, '0')}-'
    '${value.day.toString().padLeft(2, '0')}';
