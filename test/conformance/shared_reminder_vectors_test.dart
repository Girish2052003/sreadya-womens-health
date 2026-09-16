import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:sreva/features/reminders/domain/reminder_models.dart';
import 'package:sreva/features/reminders/domain/reminder_policy.dart';

void main() {
  test('reminder policy matches every shared golden vector', () {
    final file = File('shared/reminders/test-vectors/reminder-v1.json');
    expect(file.existsSync(), isTrue, reason: 'shared reminder vectors missing');

    final payload = jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
    expect(payload['version'], 'reminder-v1');
    final cases = (payload['cases'] as List).cast<Map<String, dynamic>>();
    expect(cases, isNotEmpty);

    for (final vector in cases) {
      final settingsJson = vector['settings'] as Map<String, dynamic>;
      final settings = ReminderPolicySettings(
        enabledOffsetsDays: (settingsJson['enabledOffsetsDays'] as List)
            .cast<num>()
            .map((value) => value.toInt())
            .toSet(),
        lateDays: (settingsJson['lateDays'] as num).toInt(),
        hour: (settingsJson['hour'] as num).toInt(),
        minute: (settingsJson['minute'] as num).toInt(),
        privacy: NotificationPrivacy.values.byName(
          settingsJson['privacy'] as String,
        ),
        quietStartHour: (settingsJson['quietStartHour'] as num).toInt(),
        quietEndHour: (settingsJson['quietEndHour'] as num).toInt(),
      );

      final actual = const ReminderPolicy().periodPlans(
        predictedDate: DateTime.parse(vector['predictedDate'] as String),
        sourcePredictionId: vector['sourcePredictionId'] as String,
        settings: settings,
        now: DateTime.parse(vector['now'] as String),
      );
      final expected = (vector['expectedPlans'] as List)
          .cast<Map<String, dynamic>>();

      expect(actual.length, expected.length, reason: vector['id'] as String);
      for (var index = 0; index < expected.length; index++) {
        expect(actual[index].kind.name, expected[index]['kind']);
        expect(
          _localMinute(actual[index].targetLocal),
          expected[index]['targetLocal'],
          reason: vector['id'] as String,
        );
        expect(actual[index].privacy.name, expected[index]['privacy']);
        expect(
          actual[index].sourcePredictionId,
          vector['sourcePredictionId'],
        );
      }
    }
  });

  test('notification privacy copy matches shared reminder vectors', () {
    final file = File('shared/reminders/test-vectors/reminder-v1.json');
    expect(file.existsSync(), isTrue);
    final payload = jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
    final copies = (payload['notificationBodies'] as List)
        .cast<Map<String, dynamic>>();
    final planner = ReminderPlanner();

    for (final vector in copies) {
      final plan = planner.periodBefore(
        id: vector['id'] as String,
        predictedDate: DateTime(2026, 10, 20),
        daysBefore: (vector['daysBefore'] as num).toInt(),
        hour: 8,
        minute: 0,
        privacy: NotificationPrivacy.values.byName(
          vector['privacy'] as String,
        ),
      );
      expect(planner.notificationBody(plan), vector['body']);
    }
  });
}

String _localMinute(DateTime value) =>
    '${value.year.toString().padLeft(4, '0')}-'
    '${value.month.toString().padLeft(2, '0')}-'
    '${value.day.toString().padLeft(2, '0')}T'
    '${value.hour.toString().padLeft(2, '0')}:'
    '${value.minute.toString().padLeft(2, '0')}';
