import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class MobileSyncControlState {
  const MobileSyncControlState({
    this.paused = false,
    this.disabled = false,
    this.lastSuccessfulSync,
  });

  final bool paused;
  final bool disabled;
  final String? lastSuccessfulSync;
}

class MobileSyncControlStore {
  MobileSyncControlStore({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  static const _pausedKey = 'sreadya.sync.paused.v1';
  static const _disabledKey = 'sreadya.sync.disabled.v1';
  static const _lastSuccessKey = 'sreadya.sync.last-success.v1';

  final FlutterSecureStorage _storage;

  Future<MobileSyncControlState> read() async {
    final values = await Future.wait([
      _storage.read(key: _pausedKey),
      _storage.read(key: _disabledKey),
      _storage.read(key: _lastSuccessKey),
    ]);
    return MobileSyncControlState(
      paused: values[0] == 'true',
      disabled: values[1] == 'true',
      lastSuccessfulSync: values[2],
    );
  }

  Future<void> pause() async {
    await _storage.write(key: _pausedKey, value: 'true');
    await _storage.write(key: _disabledKey, value: 'false');
  }

  Future<void> resume() async {
    await _storage.write(key: _pausedKey, value: 'false');
    await _storage.write(key: _disabledKey, value: 'false');
  }

  Future<void> disable() async {
    await _storage.write(key: _disabledKey, value: 'true');
    await _storage.write(key: _pausedKey, value: 'false');
  }

  Future<void> recordSuccessfulSync(DateTime when) => _storage.write(
    key: _lastSuccessKey,
    value: when.toUtc().toIso8601String(),
  );
}
