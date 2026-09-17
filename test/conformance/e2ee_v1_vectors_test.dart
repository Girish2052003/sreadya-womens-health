import 'dart:convert';
import 'dart:io';

import 'package:cryptography/cryptography.dart';
import 'package:flutter_test/flutter_test.dart';

const _vectorPath = 'shared/crypto/interoperability-vectors/e2ee-v1.json';

void main() {
  test('E2EE v1 recovery, transfer, and event vectors decrypt in Dart', () async {
    final vector = await _loadVector();

    for (final name in [
      'recoveryEnvelope',
      'trustedDeviceTransfer',
      'syncEvent',
    ]) {
      final entry = vector[name] as Map<String, dynamic>;
      final ikm = _hexBytes(entry['ikmHex'] as String);
      final salt = _hexBytes(entry['saltHex'] as String);
      final info = _hexBytes(entry['infoHex'] as String);
      final expectedKey = _hexBytes(entry['derivedKeyHex'] as String);
      final derived = await Hkdf(hmac: Hmac.sha256(), outputLength: 32).deriveKey(
        secretKey: SecretKey(ikm),
        nonce: salt,
        info: info,
      );
      expect(await derived.extractBytes(), expectedKey, reason: '$name HKDF');

      final sealed = _hexBytes(entry['ciphertextAndTagHex'] as String);
      final nonce = _hexBytes(entry['nonceHex'] as String);
      final box = SecretBox(
        sealed.sublist(0, sealed.length - 16),
        nonce: nonce,
        mac: Mac(sealed.sublist(sealed.length - 16)),
      );
      final clear = await AesGcm.with256bits().decrypt(
        box,
        secretKey: SecretKey(expectedKey),
        aad: _hexBytes(entry['aadHex'] as String),
      );
      expect(_hex(clear), entry['plaintextHex'], reason: '$name AES-GCM');
    }
  });

  test('E2EE v1 Ed25519 verification vector verifies in Dart', () async {
    final vector = await _loadVector();
    final entry = vector['deviceAuthentication'] as Map<String, dynamic>;
    final publicKey = SimplePublicKey(
      _hexBytes(entry['publicKeyHex'] as String),
      type: KeyPairType.ed25519,
    );
    final signature = Signature(
      _hexBytes(entry['signatureHex'] as String),
      publicKey: publicKey,
    );

    final ok = await Ed25519().verify(
      _hexBytes(entry['transcriptHex'] as String),
      signature: signature,
    );
    expect(ok, isTrue);
  });
}

Future<Map<String, dynamic>> _loadVector() async {
  final decoded = jsonDecode(await File(_vectorPath).readAsString());
  if (decoded is! Map<String, dynamic>) {
    throw const FormatException('E2EE v1 interoperability vector must be an object.');
  }
  return decoded;
}

List<int> _hexBytes(String value) {
  if (value.length.isOdd) throw const FormatException('Invalid hex length.');
  return [
    for (var i = 0; i < value.length; i += 2)
      int.parse(value.substring(i, i + 2), radix: 16),
  ];
}

String _hex(List<int> bytes) =>
    bytes.map((value) => value.toRadixString(16).padLeft(2, '0')).join();
