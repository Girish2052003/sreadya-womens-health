import '../../../core/settings/local_settings_store.dart';
import '../domain/app_preferences.dart';

class AppPreferencesStore {
  AppPreferencesStore({LocalSettingsStore? settings})
    : _settings = settings ?? LocalSettingsStore();

  static const _key = 'sreadya.app-preferences.v1';
  final LocalSettingsStore _settings;

  Future<AppPreferences> read() async {
    return await _settings.readJson<AppPreferences>(_key, (value) {
          final json = Map<String, Object?>.from(value! as Map);
          return AppPreferences.fromJson(json);
        }) ??
        const AppPreferences();
  }

  Future<void> write(AppPreferences value) =>
      _settings.writeJson(_key, value.toJson());
}
