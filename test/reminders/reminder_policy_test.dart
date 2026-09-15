import 'package:flutter_test/flutter_test.dart';
import 'package:sreva/features/reminders/domain/reminder_models.dart';
import 'package:sreva/features/reminders/domain/reminder_policy.dart';

void main() {
  test('creates every enabled period reminder without inventing disabled reminders', () {
    final prediction = DateTime(2026, 10, 20);
    final settings = ReminderPolicySettings(
      enabledOffsetsDays: const {7, 3, 1, 0},
      lateDays: 2,
      hour: 8,
      minute: 15,
      privacy: NotificationPrivacy.maximum,
      quietStartHour: 22,
      quietEndHour: 7,
    );

    final plans = ReminderPolicy().periodPlans(
      predictedDate: prediction,
      sourcePredictionId: 'prediction-1',
      settings: settings,
      now: DateTime(2026, 10, 1),
    );

    expect(plans.map((plan) => plan.kind).toSet(), {
      ReminderKind.periodSevenDays,
      ReminderKind.periodThreeDays,
      ReminderKind.periodOneDay,
      ReminderKind.periodExpectedDay,
      ReminderKind.periodLate,
    });
    expect(plans.singleWhere((p) => p.kind == ReminderKind.periodThreeDays).targetLocal,
        DateTime(2026, 10, 17, 8, 15));
    expect(plans.singleWhere((p) => p.kind == ReminderKind.periodLate).targetLocal,
        DateTime(2026, 10, 22, 8, 15));
  });

  test('moves a reminder out of quiet hours deterministically', () {
    final settings = ReminderPolicySettings(
      enabledOffsetsDays: const {3},
      hour: 23,
      minute: 30,
      privacy: NotificationPrivacy.maximum,
      quietStartHour: 22,
      quietEndHour: 7,
    );

    final plan = ReminderPolicy().periodPlans(
      predictedDate: DateTime(2026, 10, 20),
      sourcePredictionId: 'prediction-1',
      settings: settings,
      now: DateTime(2026, 10, 1),
    ).single;

    expect(plan.targetLocal, DateTime(2026, 10, 17, 7));
  });
}
