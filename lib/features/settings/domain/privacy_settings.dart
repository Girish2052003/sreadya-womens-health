import '../../reminders/domain/reminder_models.dart';

class PrivacySettings {
  const PrivacySettings({
    this.appLockEnabled = false,
    this.autoLockMinutes = 1,
    this.notificationPrivacy = NotificationPrivacy.maximum,
    this.analyticsEnabled = false,
  });

  final bool appLockEnabled;
  final int autoLockMinutes;
  final NotificationPrivacy notificationPrivacy;
  final bool analyticsEnabled;

  PrivacySettings copyWith({
    bool? appLockEnabled,
    int? autoLockMinutes,
    NotificationPrivacy? notificationPrivacy,
  }) => PrivacySettings(
    appLockEnabled: appLockEnabled ?? this.appLockEnabled,
    autoLockMinutes: autoLockMinutes ?? this.autoLockMinutes,
    notificationPrivacy: notificationPrivacy ?? this.notificationPrivacy,
    analyticsEnabled: false,
  );
}
