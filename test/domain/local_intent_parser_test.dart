import 'package:flutter_test/flutter_test.dart';
import 'package:sreva/features/assistant/domain/local_intent_parser.dart';

void main() {
  final now = DateTime(2026, 9, 15, 9);
  final parser = LocalIntentParser();

  test('parses period started yesterday', () {
    final result = parser.parse('My period started yesterday', now: now);
    expect(result.intent, LocalIntent.periodStarted);
    expect(result.date, DateTime(2026, 9, 14));
    expect(result.requiresConfirmation, isTrue);
  });

  test('parses heavy flow yesterday', () {
    final result = parser.parse('Yesterday was heavy', now: now);
    expect(result.intent, LocalIntent.logFlow);
    expect(result.value, 'heavy');
    expect(result.date, DateTime(2026, 9, 14));
  });

  test('does not invent meaning for ambiguous commands', () {
    final result = parser.parse('It feels different', now: now);
    expect(result.intent, LocalIntent.unknown);
    expect(result.requiresConfirmation, isTrue);
  });
}

// Worldwide-v1 query/reminder coverage is intentionally explicit: private text
// commands must remain deterministic and never require a cloud language model.
