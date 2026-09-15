import 'dart:convert';
import 'dart:typed_data';

import 'package:cryptography/cryptography.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class VaultCipher {
  VaultCipher({FlutterSecureStorage? secureStorage})
    : _secureStorage = secureStorage ?? const FlutterSecureStorage();

  static const _keyName = 'sreva.vault.master.v1';
  final FlutterSecureStorage _secureStorage;
  final AesGcm _algorithm = AesGcm.with256bits();
  SecretKey? _cachedKey;

  Future<SecretKey> _key() async {
    final cached = _cachedKey;
    if (cached != null) return cached;
    final encoded = await _secureStorage.read(key: _keyName);
    if (encoded != null) {
      final key = SecretKey(base64Decode(encoded));
      _cachedKey = key;
      return key;
    }
    final key = await _algorithm.newSecretKey();
    final bytes = await key.extractBytes();
    await _secureStorage.write(key: _keyName, value: base64Encode(bytes));
    _cachedKey = key;
    return key;
  }

  Future<Uint8List> encryptJson(Map<String, Object?> value) async {
    final clear = utf8.encode(jsonEncode(value));
    final box = await _algorithm.encrypt(clear, secretKey: await _key());
    return box.concatenation();
  }

  Future<Map<String, dynamic>> decryptJson(List<int> value) async {
    final box = SecretBox.fromConcatenation(
      value,
      nonceLength: _algorithm.nonceLength,
      macLength: _algorithm.macAlgorithm.macLength,
      copy: false,
    );
    final clear = await _algorithm.decrypt(box, secretKey: await _key());
    return jsonDecode(utf8.decode(clear)) as Map<String, dynamic>;
  }
}
