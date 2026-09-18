import '../../../core/settings/local_settings_store.dart';
import '../domain/life_stage.dart';

class LifeStageStore {
  LifeStageStore({LocalSettingsStore? settings})
    : _settings = settings ?? LocalSettingsStore();
  static const _key = 'sreadya.life-stage.v1';
  final LocalSettingsStore _settings;

  Future<LifeStageMode> read() async {
    final raw = await _settings.readString(_key);
    if (raw == null) return LifeStageMode.cycleTracking;
    return LifeStageMode.values.byName(raw);
  }

  Future<void> write(LifeStageMode stage) =>
      _settings.writeString(_key, stage.name);
}
