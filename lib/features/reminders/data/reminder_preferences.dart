import '../../../core/settings/local_settings_store.dart';
import '../domain/reminder_models.dart';

class ReminderPreferences {
  const ReminderPreferences({
    this.enabled = true,
    this.enabledOffsetsDays = const {3},
    this.lateDays = 0,
    this.hour = 8,
    this.minute = 0,
    this.privacy = NotificationPrivacy.maximum,
    this.quietStartHour = 22,
    this.quietEndHour = 7,
  });

  final bool enabled;
  final Set<int> enabledOffsetsDays;

  /// 0 disables the late reminder. Positive values are days after the
  /// predicted date.
  final int lateDays;
  final int hour;
  final int minute;
  final NotificationPrivacy privacy;
  final int quietStartHour;
  final int quietEndHour;

  ReminderPreferences copyWith({
    bool? enabled,
    Set<int>? enabledOffsetsDays,
    int? lateDays,
    int? hour,
    int? minute,
    NotificationPrivacy? privacy,
    int? quietStartHour,
    int? quietEndHour,
  }) {
    return ReminderPreferences(
      enabled: enabled ?? this.enabled,
      enabledOffsetsDays: enabledOffsetsDays ?? this.enabledOffsetsDays,
      lateDays: lateDays ?? this.lateDays,
      hour: hour ?? this.hour,
      minute: minute ?? this.minute,
      privacy: privacy ?? this.privacy,
      quietStartHour: quietStartHour ?? this.quietStartHour,
      quietEndHour: quietEndHour ?? this.quietEndHour,
    );
  }

  Map<String, Object> toJson() => {
        'enabled': enabled,
        'enabledOffsetsDays': enabledOffsetsDays.toList()..sort(),
        'lateDays': lateDays,
        'hour': hour,
        'minute': minute,
        'privacy': privacy.name,
        'quietStartHour': quietStartHour,
        'quietEndHour': quietEndHour,
      };

  factory ReminderPreferences.fromJson(Map<String, dynamic> json) {
    final offsets = (json['enabledOffsetsDays'] as List<dynamic>?)
        ?.map((value) => value as int)
        .where((value) => const {0, 1, 3, 7}.contains(value))
        .toSet();
    // v1 migration: older builds stored exactly one `daysBefore` value.
    final legacy = json['daysBefore'] as int?;
    return ReminderPreferences(
      enabled: json['enabled'] as bool? ?? true,
      enabledOffsetsDays: offsets == null || offsets.isEmpty
          ? {legacy ?? 3}
          : offsets,
      lateDays: json['lateDays'] as int? ?? 0,
      hour: json['hour'] as int? ?? 8,
      minute: json['minute'] as int? ?? 0,
      privacy: NotificationPrivacy.values.byName(
        json['privacy'] as String? ?? 'maximum',
      ),
      quietStartHour: json['quietStartHour'] as int? ?? 22,
      quietEndHour: json['quietEndHour'] as int? ?? 7,
    );
  }
}

class ReminderPreferencesStore {
  ReminderPreferencesStore({LocalSettingsStore? settings})
      : _settings = settings ?? LocalSettingsStore();

  static const _key = 'sreva.reminder.preferences.v1';
  final LocalSettingsStore _settings;

  Future<ReminderPreferences> read() async {
    return await _settings.readJson<ReminderPreferences>(
          _key,
          (value) => ReminderPreferences.fromJson(
            Map<String, dynamic>.from(value! as Map),
          ),
        ) ??
        const ReminderPreferences();
  }

  Future<void> write(ReminderPreferences value) =>
      _settings.writeJson(_key, value.toJson());
}
