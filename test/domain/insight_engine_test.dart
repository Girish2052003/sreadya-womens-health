import 'package:flutter_test/flutter_test.dart';
import 'package:sreadya/features/insights/domain/insight_engine.dart';

void main() {
  test('uses observational not causal wording', () {
    final engine = InsightEngine();
    final insight = engine.symptomTimingInsight(
      symptomLabel: 'Headache',
      cycleDays: const [27, 28, 1, 1, 2],
    );
    expect(insight.toLowerCase(), contains('recorded'));
    expect(insight.toLowerCase(), isNot(contains('caused')));
  });
}
