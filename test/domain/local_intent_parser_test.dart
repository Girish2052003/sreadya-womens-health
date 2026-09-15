import 'package:flutter_test/flutter_test.dart';
import 'package:sreva/features/assistant/domain/local_intent_parser.dart';
import 'package:sreva/features/reminders/domain/reminder_models.dart';

void main() {
  final now = DateTime(2026, 9, 15, 9);
  final parser = LocalIntentParser();

  test('parses period started yesterday', () {
    final result = parser.parse('My period started yesterday', now: now);
    expect(result.intent, LocalIntent.periodStarted);
    expect(result.date, DateTime(2026, 9, 14));
    expect(result.requiresConfirmation, isTrue);
  });

  test('parses period ended today', () {
    final result = parser.parse('My period ended today', now: now);
    expect(result.intent, LocalIntent.periodEnded);
    expect(result.date, DateTime(2026, 9, 15));
    expect(result.requiresConfirmation, isTrue);
  });

  test('parses heavy flow yesterday', () {
    final result = parser.parse('Yesterday was heavy', now: now);
    expect(result.intent, LocalIntent.logFlow);
    expect(result.value, 'heavy');
    expect(result.date, DateTime(2026, 9, 14));
  });

  test('parses symptom with deterministic kind and severity', () {
    final result = parser.parse('I have severe cramps today', now: now);
    expect(result.intent, LocalIntent.logSymptom);
    expect(result.observationKind?.name, 'cramps');
    expect(result.severity?.name, 'severe');
    expect(result.requiresConfirmation, isTrue);
  });

  test('parses private medication reminder with local clock time', () {
    final result = parser.parse('Remind me to take medicine at 8:30 pm', now: now);
    expect(result.intent, LocalIntent.addReminder);
    expect(result.reminderKind, ReminderKind.medication);
    expect(result.reminderHour, 20);
    expect(result.reminderMinute, 30);
    expect(result.requiresConfirmation, isTrue);
  });

  test('parses contraception reminder explicitly', () {
    final result = parser.parse('Remind me to take my pill at 7 am', now: now);
    expect(result.intent, LocalIntent.addReminder);
    expect(result.reminderKind, ReminderKind.contraception);
    expect(result.reminderHour, 7);
    expect(result.reminderMinute, 0);
  });

  test('parses next-period query without requiring confirmation', () {
    final result = parser.parse('When is my next period?', now: now);
    expect(result.intent, LocalIntent.nextPeriodQuery);
    expect(result.requiresConfirmation, isFalse);
  });

  test('parses period-history query without requiring confirmation', () {
    final result = parser.parse('Show my last six periods', now: now);
    expect(result.intent, LocalIntent.historyQuery);
    expect(result.requiresConfirmation, isFalse);
  });

  test('does not invent meaning for ambiguous commands', () {
    final result = parser.parse('It feels different', now: now);
    expect(result.intent, LocalIntent.unknown);
    expect(result.requiresConfirmation, isTrue);
  });
}
