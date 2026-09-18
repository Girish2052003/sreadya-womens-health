import 'package:flutter_test/flutter_test.dart';
import 'package:sreadya/features/reminders/domain/reminder_models.dart';
import 'package:sreadya/features/reminders/domain/reminder_policy.dart';

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
    expect(
      plans
          .singleWhere((p) => p.kind == ReminderKind.periodThreeDays)
          .targetLocal,
      DateTime(2026, 10, 17, 8, 15),
    );
    expect(
      plans.singleWhere((p) => p.kind == ReminderKind.periodLate).targetLocal,
      DateTime(2026, 10, 22, 8, 15),
    );
  });

  test('moves a reminder out of quiet hours deterministically', () {
    final settings = ReminderPolicySettings(
      enabledOffsetsDays: const {3},
      lateDays: 0,
      hour: 23,
      minute: 30,
      privacy: NotificationPrivacy.maximum,
      quietStartHour: 22,
      quietEndHour: 7,
    );

    final plan = ReminderPolicy()
        .periodPlans(
          predictedDate: DateTime(2026, 10, 20),
          sourcePredictionId: 'prediction-1',
          settings: settings,
          now: DateTime(2026, 10, 1),
        )
        .single;

    expect(plan.targetLocal, DateTime(2026, 10, 17, 7));
  });

  test('three-day reminder crosses a year boundary correctly', () {
    final settings = ReminderPolicySettings(
      enabledOffsetsDays: const {3},
      lateDays: 0,
      hour: 8,
      minute: 0,
      privacy: NotificationPrivacy.maximum,
      quietStartHour: 22,
      quietEndHour: 7,
    );

    final plan = ReminderPolicy()
        .periodPlans(
          predictedDate: DateTime(2027, 1, 2),
          sourcePredictionId: 'prediction-year',
          settings: settings,
          now: DateTime(2026, 12, 1),
        )
        .single;

    expect(plan.targetLocal, DateTime(2026, 12, 30, 8));
  });

  test('three-day reminder crosses leap day correctly', () {
    final settings = ReminderPolicySettings(
      enabledOffsetsDays: const {3},
      lateDays: 0,
      hour: 8,
      minute: 0,
      privacy: NotificationPrivacy.maximum,
      quietStartHour: 22,
      quietEndHour: 7,
    );

    final plan = ReminderPolicy()
        .periodPlans(
          predictedDate: DateTime(2028, 3, 2),
          sourcePredictionId: 'prediction-leap',
          settings: settings,
          now: DateTime(2028, 2, 1),
        )
        .single;

    expect(plan.targetLocal, DateTime(2028, 2, 28, 8));
  });

  test('past reminders are not scheduled', () {
    final settings = ReminderPolicySettings(
      enabledOffsetsDays: const {7, 3, 1, 0},
      lateDays: 2,
      hour: 8,
      minute: 0,
      privacy: NotificationPrivacy.maximum,
      quietStartHour: 22,
      quietEndHour: 7,
    );

    final plans = ReminderPolicy().periodPlans(
      predictedDate: DateTime(2026, 10, 20),
      sourcePredictionId: 'prediction-past',
      settings: settings,
      now: DateTime(2026, 10, 23),
    );

    expect(plans, isEmpty);
  });

  test('notification privacy modes expose only their intended detail', () {
    final planner = ReminderPlanner();
    final maximum = planner.periodBefore(
      id: 'maximum',
      predictedDate: DateTime(2026, 10, 20),
      daysBefore: 3,
      hour: 8,
      minute: 0,
      privacy: NotificationPrivacy.maximum,
    );
    final balanced = planner.periodBefore(
      id: 'balanced',
      predictedDate: DateTime(2026, 10, 20),
      daysBefore: 3,
      hour: 8,
      minute: 0,
      privacy: NotificationPrivacy.balanced,
    );
    final detailed = planner.periodBefore(
      id: 'detailed',
      predictedDate: DateTime(2026, 10, 20),
      daysBefore: 3,
      hour: 8,
      minute: 0,
      privacy: NotificationPrivacy.detailed,
    );

    expect(planner.notificationBody(maximum), 'You have a reminder.');
    expect(planner.notificationBody(balanced), 'Your cycle reminder is ready.');
    expect(
      planner.notificationBody(detailed),
      'Your period may begin in about 3 days.',
    );
  });
}
