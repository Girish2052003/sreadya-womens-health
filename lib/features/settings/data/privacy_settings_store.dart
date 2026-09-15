import '../../../core/settings/local_settings_store.dart';
import '../../reminders/domain/reminder_models.dart';
import '../domain/privacy_settings.dart';

class PrivacySettingsStore {
  PrivacySettingsStore({LocalSettingsStore? settings}) : _settings = settings ?? LocalSettingsStore();
  static const _key = 'sreva.privacy-settings.v1';
  final LocalSettingsStore _settings;

  Future<PrivacySettings> read() async {
    return await _settings.readJson<PrivacySettings>(_key, (value) {
          final json = Map<String, dynamic>.from(value! as Map);
          return PrivacySettings(
            appLockEnabled: json['appLockEnabled'] as bool? ?? false,
            autoLockMinutes: json['autoLockMinutes'] as int? ?? 1,
            notificationPrivacy: NotificationPrivacy.values.byName(json['notificationPrivacy'] as String? ?? 'maximum'),
            analyticsEnabled: false,
          );
        }) ??
        const PrivacySettings();
  }

  Future<void> write(PrivacySettings value) => _settings.writeJson(_key, {
        'appLockEnabled': value.appLockEnabled,
        'autoLockMinutes': value.autoLockMinutes,
        'notificationPrivacy': value.notificationPrivacy.name,
        'analyticsEnabled': false,
      });
}
