import 'dart:convert';

import 'package:flutter/services.dart';

class NativePasskeyAdapter {
  NativePasskeyAdapter({MethodChannel? channel})
    : _channel = channel ?? const MethodChannel('sreadya/account');

  final MethodChannel _channel;

  Future<bool> isAvailable() async {
    try {
      return await _channel.invokeMethod<bool>('passkey.isAvailable') ?? false;
    } on MissingPluginException {
      return false;
    } on PlatformException {
      return false;
    }
  }

  Future<Map<String, Object?>> createCredential(
    Map<String, Object?> publicKeyOptions,
  ) => _invoke('passkey.create', publicKeyOptions);

  Future<Map<String, Object?>> getCredential(
    Map<String, Object?> publicKeyOptions,
  ) => _invoke('passkey.get', publicKeyOptions);

  Future<Map<String, Object?>> _invoke(
    String method,
    Map<String, Object?> publicKeyOptions,
  ) async {
    final response = await _channel.invokeMethod<String>(method, {
      'requestJson': jsonEncode(publicKeyOptions),
    });
    if (response == null || response.isEmpty) {
      throw StateError('Native passkey ceremony returned no credential.');
    }
    final decoded = jsonDecode(response);
    if (decoded is! Map) {
      throw const FormatException(
        'Invalid native passkey credential response.',
      );
    }
    return decoded.map(
      (key, value) => MapEntry(key.toString(), value as Object?),
    );
  }
}
