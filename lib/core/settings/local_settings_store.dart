import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class LocalSettingsStore {
  LocalSettingsStore({FlutterSecureStorage? secureStorage})
    : _storage = secureStorage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  Future<T?> readJson<T>(String key, T Function(Object? value) decode) async {
    final value = await _storage.read(key: key);
    if (value == null) return null;
    return decode(jsonDecode(value));
  }

  Future<void> writeJson(String key, Object? value) =>
      _storage.write(key: key, value: jsonEncode(value));

  Future<bool> readBool(String key, {bool fallback = false}) async {
    final value = await _storage.read(key: key);
    if (value == null) return fallback;
    return value == 'true';
  }

  Future<void> writeBool(String key, bool value) =>
      _storage.write(key: key, value: value.toString());

  Future<String?> readString(String key) => _storage.read(key: key);
  Future<void> writeString(String key, String value) =>
      _storage.write(key: key, value: value);
}
