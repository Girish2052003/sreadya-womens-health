import 'dart:convert';
import 'dart:math';

import 'package:cryptography/cryptography.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class PinLockService {
  PinLockService({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  static const _key = 'sreva.app-pin.verifier.v1';
  final FlutterSecureStorage _storage;
  final Argon2id _kdf = Argon2id(
    memory: 19 * 1024,
    parallelism: 1,
    iterations: 2,
    hashLength: 32,
  );

  static bool isValidPin(String pin) => RegExp(r'^\d{6,10}$').hasMatch(pin);

  Future<bool> isConfigured() async => (await _storage.read(key: _key)) != null;

  Future<void> setPin(String pin) async {
    if (!isValidPin(pin)) {
      throw ArgumentError('Sreva PIN must contain 6–10 digits.');
    }
    final random = Random.secure();
    final salt = List<int>.generate(16, (_) => random.nextInt(256));
    final hash = await _derive(pin, salt);
    await _storage.write(
      key: _key,
      value: jsonEncode({
        'salt': base64Encode(salt),
        'hash': base64Encode(hash),
      }),
    );
  }

  Future<bool> verify(String pin) async {
    if (!isValidPin(pin)) return false;
    final raw = await _storage.read(key: _key);
    if (raw == null) return false;
    try {
      final json = Map<String, dynamic>.from(jsonDecode(raw) as Map);
      final salt = base64Decode(json['salt'] as String);
      final expected = base64Decode(json['hash'] as String);
      final actual = await _derive(pin, salt);
      if (expected.length != actual.length) return false;
      var difference = 0;
      for (var i = 0; i < expected.length; i++) {
        difference |= expected[i] ^ actual[i];
      }
      return difference == 0;
    } catch (_) {
      return false;
    }
  }

  Future<void> clear() => _storage.delete(key: _key);

  Future<List<int>> _derive(String pin, List<int> salt) async {
    final key = await _kdf.deriveKeyFromPassword(password: pin, nonce: salt);
    return key.extractBytes();
  }
}
