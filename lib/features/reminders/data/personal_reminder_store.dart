import '../../../core/settings/local_settings_store.dart';
import '../domain/reminder_models.dart';

class PersonalReminder {
  const PersonalReminder({
    required this.id,
    required this.kind,
    required this.hour,
    required this.minute,
    required this.label,
    this.enabled = true,
  });

  final String id;
  final ReminderKind kind;
  final int hour;
  final int minute;
  final String label;
  final bool enabled;

  Map<String, Object> toJson() => {
        'id': id,
        'kind': kind.name,
        'hour': hour,
        'minute': minute,
        'label': label,
        'enabled': enabled,
      };

  factory PersonalReminder.fromJson(Map<String, dynamic> json) => PersonalReminder(
        id: json['id'] as String,
        kind: ReminderKind.values.byName(json['kind'] as String),
        hour: json['hour'] as int,
        minute: json['minute'] as int,
        label: json['label'] as String,
        enabled: json['enabled'] as bool? ?? true,
      );
}

class PersonalReminderStore {
  PersonalReminderStore({LocalSettingsStore? settings}) : _settings = settings ?? LocalSettingsStore();
  static const _key = 'sreva.personal-reminders.v1';
  final LocalSettingsStore _settings;

  Future<List<PersonalReminder>> readAll() async {
    return await _settings.readJson<List<PersonalReminder>>(_key, (value) {
          return (value as List<dynamic>)
              .map((item) => PersonalReminder.fromJson(Map<String, dynamic>.from(item as Map)))
              .toList();
        }) ??
        const [];
  }

  Future<void> writeAll(List<PersonalReminder> reminders) =>
      _settings.writeJson(_key, reminders.map((value) => value.toJson()).toList());
}
