enum ReminderState { disabled, permissionNeeded, scheduled, stale, blocked, error }
enum NotificationPrivacy { maximum, balanced, detailed }
enum ReminderKind {
  periodSevenDays,
  periodThreeDays,
  periodOneDay,
  periodExpectedDay,
  periodLate,
  medication,
  contraception,
  supplement,
  ovulationTest,
  pregnancyTest,
}

class ReminderPlan {
  const ReminderPlan({
    required this.id,
    required this.kind,
    required this.targetLocal,
    required this.privacy,
    this.sourcePredictionId,
    this.repeatDaily = false,
    this.label,
  });

  final String id;
  final ReminderKind kind;
  final DateTime targetLocal;
  final NotificationPrivacy privacy;
  final String? sourcePredictionId;
  final bool repeatDaily;
  final String? label;
}


class ReminderPlanner {
  ReminderPlan periodBefore({
    required String id,
    required DateTime predictedDate,
    required int daysBefore,
    required int hour,
    required int minute,
    NotificationPrivacy privacy = NotificationPrivacy.maximum,
    String? sourcePredictionId,
  }) {
    final date = DateTime(predictedDate.year, predictedDate.month, predictedDate.day)
        .subtract(Duration(days: daysBefore));
    return ReminderPlan(
      id: id,
      kind: switch (daysBefore) {
        7 => ReminderKind.periodSevenDays,
        3 => ReminderKind.periodThreeDays,
        1 => ReminderKind.periodOneDay,
        _ => ReminderKind.periodExpectedDay,
      },
      targetLocal: DateTime(date.year, date.month, date.day, hour, minute),
      privacy: privacy,
      sourcePredictionId: sourcePredictionId,
    );
  }

  ReminderPlan personalDaily({
    required String id,
    required ReminderKind kind,
    required int hour,
    required int minute,
    required String label,
    NotificationPrivacy privacy = NotificationPrivacy.maximum,
  }) {
    final now = DateTime.now();
    var target = DateTime(now.year, now.month, now.day, hour, minute);
    if (!target.isAfter(now)) target = target.add(const Duration(days: 1));
    return ReminderPlan(
      id: id,
      kind: kind,
      targetLocal: target,
      privacy: privacy,
      repeatDaily: true,
      label: label,
    );
  }

  String notificationBody(ReminderPlan plan) => switch (plan.privacy) {
        NotificationPrivacy.maximum => 'You have a reminder.',
        NotificationPrivacy.balanced => 'Your cycle reminder is ready.',
        NotificationPrivacy.detailed => switch (plan.kind) {
            ReminderKind.periodThreeDays => 'Your period may begin in about 3 days.',
            ReminderKind.periodSevenDays => 'Your period may begin in about 7 days.',
            ReminderKind.periodOneDay => 'Your period may begin tomorrow.',
            ReminderKind.periodExpectedDay => 'Your period is expected around today.',
            ReminderKind.periodLate => 'Your predicted period window has passed.',
            _ => 'Your health reminder is ready.',
          },
      };
}
