import 'reminder_models.dart';

class ReminderPolicySettings {
  const ReminderPolicySettings({
    required this.enabledOffsetsDays,
    required this.lateDays,
    required this.hour,
    required this.minute,
    required this.privacy,
    required this.quietStartHour,
    required this.quietEndHour,
  });

  final Set<int> enabledOffsetsDays;
  final int lateDays;
  final int hour;
  final int minute;
  final NotificationPrivacy privacy;
  final int quietStartHour;
  final int quietEndHour;
}

class ReminderPolicy {
  const ReminderPolicy();

  List<ReminderPlan> periodPlans({
    required DateTime predictedDate,
    required String sourcePredictionId,
    required ReminderPolicySettings settings,
    required DateTime now,
  }) {
    final plans = <ReminderPlan>[];
    final offsets = settings.enabledOffsetsDays.toList()..sort((a, b) => b.compareTo(a));
    for (final offset in offsets) {
      final kind = switch (offset) {
        7 => ReminderKind.periodSevenDays,
        3 => ReminderKind.periodThreeDays,
        1 => ReminderKind.periodOneDay,
        0 => ReminderKind.periodExpectedDay,
        _ => null,
      };
      if (kind == null) continue;
      final day = DateTime(predictedDate.year, predictedDate.month, predictedDate.day)
          .subtract(Duration(days: offset));
      final target = _outsideQuietHours(
        DateTime(day.year, day.month, day.day, settings.hour, settings.minute),
        settings,
      );
      if (!target.isAfter(now)) continue;
      plans.add(
        ReminderPlan(
          id: 'period-${kind.name}',
          kind: kind,
          targetLocal: target,
          privacy: settings.privacy,
          sourcePredictionId: sourcePredictionId,
        ),
      );
    }

    if (settings.lateDays > 0) {
      final lateDay = DateTime(predictedDate.year, predictedDate.month, predictedDate.day)
          .add(Duration(days: settings.lateDays));
      final target = _outsideQuietHours(
        DateTime(lateDay.year, lateDay.month, lateDay.day, settings.hour, settings.minute),
        settings,
      );
      if (target.isAfter(now)) {
        plans.add(
          ReminderPlan(
            id: 'period-${ReminderKind.periodLate.name}',
            kind: ReminderKind.periodLate,
            targetLocal: target,
            privacy: settings.privacy,
            sourcePredictionId: sourcePredictionId,
          ),
        );
      }
    }
    return List.unmodifiable(plans);
  }

  DateTime _outsideQuietHours(
    DateTime candidate,
    ReminderPolicySettings settings,
  ) {
    final hour = candidate.hour;
    final wrapsMidnight = settings.quietStartHour > settings.quietEndHour;
    final quiet = wrapsMidnight
        ? hour >= settings.quietStartHour || hour < settings.quietEndHour
        : hour >= settings.quietStartHour && hour < settings.quietEndHour;
    if (!quiet) return candidate;

    // Preserve the intended reminder calendar day. This avoids a late-night
    // reminder slipping into the following cycle-relative day.
    return DateTime(
      candidate.year,
      candidate.month,
      candidate.day,
      settings.quietEndHour,
    );
  }
}
