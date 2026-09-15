import 'dart:convert';
import 'dart:math';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class DatabaseKeyProvider {
  DatabaseKeyProvider({FlutterSecureStorage? secureStorage})
    : _secureStorage = secureStorage ?? const FlutterSecureStorage();

  static const _keyName = 'sreva.database.raw-key.v1';
  final FlutterSecureStorage _secureStorage;

  Future<List<int>> readOrCreate() async {
    final existing = await _secureStorage.read(key: _keyName);
    if (existing != null) {
      final bytes = base64Decode(existing);
      if (bytes.length != 32) {
        throw StateError('Invalid Sreva database key length.');
      }
      return bytes;
    }

    final random = Random.secure();
    final key = List<int>.generate(
      32,
      (_) => random.nextInt(256),
      growable: false,
    );
    await _secureStorage.write(key: _keyName, value: base64Encode(key));
    return key;
  }

  String toSqlCipherRawKey(List<int> bytes) {
    if (bytes.length != 32) {
      throw ArgumentError.value(
        bytes.length,
        'bytes.length',
        'Expected 32 bytes',
      );
    }
    final hex = bytes
        .map((byte) => byte.toRadixString(16).padLeft(2, '0'))
        .join();
    return 'x\'$hex\'';
  }
}
