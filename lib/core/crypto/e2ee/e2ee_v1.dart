import 'dart:convert';
import 'dart:typed_data';

import 'package:cryptography/cryptography.dart';

const sreadyaE2eeSuiteV1 = 'SREADYA-AES256GCM-HKDFSHA256-ED25519-V1';

Uint8List lp16Frame(Iterable<List<int>> fields) {
  final output = BytesBuilder(copy: false);
  for (final field in fields) {
    if (field.length > 0xffff) {
      throw const FormatException('Sreadya protocol field is too large.');
    }
    output.add([(field.length >> 8) & 0xff, field.length & 0xff]);
    output.add(field);
  }
  return output.takeBytes();
}

Uint8List _utf8(String value) => Uint8List.fromList(utf8.encode(value));

void _requireNonEmpty(String value, String label) {
  if (value.isEmpty) {
    throw ArgumentError.value(value, label, 'must not be empty');
  }
}

void _requireLength(List<int> value, int length, String label) {
  if (value.length != length) {
    throw ArgumentError.value(value.length, label, 'must be $length bytes');
  }
}

class SyncEventCryptoContext {
  SyncEventCryptoContext({
    required this.accountId,
    required this.vaultId,
    required this.keyEpoch,
    required this.objectId,
    required this.eventId,
    required this.sourceDeviceId,
    required this.schemaId,
    required this.baseRevision,
    required this.operation,
    required List<int> kdfSalt,
    required List<int> nonce,
    this.protocolVersion = 1,
    this.suiteId = sreadyaE2eeSuiteV1,
  }) : kdfSalt = Uint8List.fromList(kdfSalt),
       nonce = Uint8List.fromList(nonce) {
    if (protocolVersion != 1 || suiteId != sreadyaE2eeSuiteV1) {
      throw const FormatException('Unsupported Sreadya E2EE protocol suite.');
    }
    for (final entry in <(String, String)>[
      (accountId, 'accountId'),
      (vaultId, 'vaultId'),
      (objectId, 'objectId'),
      (eventId, 'eventId'),
      (sourceDeviceId, 'sourceDeviceId'),
      (schemaId, 'schemaId'),
    ]) {
      _requireNonEmpty(entry.$1, entry.$2);
    }
    if (keyEpoch < 0 || baseRevision < 0) {
      throw const FormatException('Sreadya sync revisions must be non-negative.');
    }
    if (operation != 'upsert' && operation != 'tombstone') {
      throw const FormatException('Unsupported Sreadya sync operation.');
    }
    _requireLength(this.kdfSalt, 32, 'kdfSalt');
    _requireLength(this.nonce, 12, 'nonce');
  }

  final int protocolVersion;
  final String suiteId;
  final String accountId;
  final String vaultId;
  final int keyEpoch;
  final String objectId;
  final String eventId;
  final String sourceDeviceId;
  final String schemaId;
  final int baseRevision;
  final String operation;
  final Uint8List kdfSalt;
  final Uint8List nonce;
}

class RecoveryEnvelopeContext {
  RecoveryEnvelopeContext({
    required this.accountId,
    required this.vaultId,
    required this.keyEpoch,
    this.suiteId = sreadyaE2eeSuiteV1,
  }) {
    _requireNonEmpty(accountId, 'accountId');
    _requireNonEmpty(vaultId, 'vaultId');
    if (keyEpoch < 0) throw const FormatException('Invalid Sreadya key epoch.');
    if (suiteId != sreadyaE2eeSuiteV1) {
      throw const FormatException('Unsupported Sreadya E2EE protocol suite.');
    }
  }

  final String accountId;
  final String vaultId;
  final int keyEpoch;
  final String suiteId;
}

class TrustedDeviceTransferContext {
  TrustedDeviceTransferContext({
    required this.accountId,
    required this.vaultId,
    required this.enrollmentId,
    required this.sourceDeviceId,
    required this.targetDeviceId,
    required this.keyEpoch,
    this.suiteId = sreadyaE2eeSuiteV1,
  }) {
    for (final entry in <(String, String)>[
      (accountId, 'accountId'),
      (vaultId, 'vaultId'),
      (enrollmentId, 'enrollmentId'),
      (sourceDeviceId, 'sourceDeviceId'),
      (targetDeviceId, 'targetDeviceId'),
    ]) {
      _requireNonEmpty(entry.$1, entry.$2);
    }
    if (keyEpoch < 0) throw const FormatException('Invalid Sreadya key epoch.');
    if (suiteId != sreadyaE2eeSuiteV1) {
      throw const FormatException('Unsupported Sreadya E2EE protocol suite.');
    }
  }

  final String accountId;
  final String vaultId;
  final String enrollmentId;
  final String sourceDeviceId;
  final String targetDeviceId;
  final int keyEpoch;
  final String suiteId;
}

Uint8List syncEventKeyInfo(SyncEventCryptoContext context) => lp16Frame([
  _utf8('sreadya-event-key-v1'),
  _utf8(context.eventId),
  _utf8(context.objectId),
  _utf8(context.sourceDeviceId),
  _utf8('${context.keyEpoch}'),
  _utf8(context.suiteId),
]);

Uint8List syncEventAad(SyncEventCryptoContext context) => lp16Frame([
  _utf8('sreadya-sync-event-v1'),
  _utf8(context.accountId),
  _utf8(context.vaultId),
  _utf8(context.eventId),
  _utf8(context.objectId),
  _utf8(context.sourceDeviceId),
  _utf8('${context.keyEpoch}'),
  _utf8(context.schemaId),
  _utf8('${context.baseRevision}'),
  _utf8(context.operation),
  _utf8(context.suiteId),
]);

Uint8List recoveryKeyInfo(RecoveryEnvelopeContext context) => lp16Frame([
  _utf8('sreadya-recovery-wrap-key-v1'),
  _utf8(context.accountId),
  _utf8(context.vaultId),
  _utf8('${context.keyEpoch}'),
  _utf8(context.suiteId),
]);

Uint8List recoveryEnvelopeAad(RecoveryEnvelopeContext context) => lp16Frame([
  _utf8('sreadya-recovery-envelope-v1'),
  _utf8(context.accountId),
  _utf8(context.vaultId),
  _utf8('${context.keyEpoch}'),
  _utf8(context.suiteId),
]);

Uint8List trustedDeviceTransferKeyInfo(TrustedDeviceTransferContext context) =>
    lp16Frame([
      _utf8('sreadya-transfer-wrap-key-v1'),
      _utf8(context.accountId),
      _utf8(context.vaultId),
      _utf8(context.enrollmentId),
      _utf8(context.sourceDeviceId),
      _utf8(context.targetDeviceId),
      _utf8('${context.keyEpoch}'),
      _utf8(context.suiteId),
    ]);

Uint8List trustedDeviceTransferAad(TrustedDeviceTransferContext context) =>
    lp16Frame([
      _utf8('sreadya-device-transfer-envelope-v1'),
      _utf8(context.accountId),
      _utf8(context.vaultId),
      _utf8(context.enrollmentId),
      _utf8(context.sourceDeviceId),
      _utf8(context.targetDeviceId),
      _utf8('${context.keyEpoch}'),
      _utf8(context.suiteId),
    ]);

Uint8List deviceAuthenticationTranscript({
  required String accountId,
  required String deviceId,
  required String method,
  required String path,
  required String challenge,
  required String bodySha256Hex,
}) {
  for (final entry in <(String, String)>[
    (accountId, 'accountId'),
    (deviceId, 'deviceId'),
    (method, 'method'),
    (path, 'path'),
    (challenge, 'challenge'),
    (bodySha256Hex, 'bodySha256Hex'),
  ]) {
    _requireNonEmpty(entry.$1, entry.$2);
  }
  return lp16Frame([
    _utf8('sreadya-device-auth-v1'),
    _utf8(accountId),
    _utf8(deviceId),
    _utf8(method.toUpperCase()),
    _utf8(path),
    _utf8(challenge),
    _utf8(bodySha256Hex.toLowerCase()),
  ]);
}

class E2eeV1Crypto {
  E2eeV1Crypto({Hkdf? hkdf, AesGcm? aesGcm})
    : _hkdf = hkdf ?? Hkdf(hmac: Hmac.sha256(), outputLength: 32),
      _aesGcm = aesGcm ?? AesGcm.with256bits();

  final Hkdf _hkdf;
  final AesGcm _aesGcm;

  Future<Uint8List> deriveKey({
    required List<int> secret,
    required List<int> salt,
    required List<int> info,
  }) async {
    _requireLength(secret, 32, 'secret');
    _requireLength(salt, 32, 'salt');
    final key = await _hkdf.deriveKey(
      secretKey: SecretKey(secret),
      nonce: salt,
      info: info,
    );
    return Uint8List.fromList(await key.extractBytes());
  }

  Future<Uint8List> deriveSyncEventKey(
    List<int> vaultRootSecret,
    SyncEventCryptoContext context,
  ) => deriveKey(
    secret: vaultRootSecret,
    salt: context.kdfSalt,
    info: syncEventKeyInfo(context),
  );

  Future<Uint8List> deriveRecoveryWrappingKey(
    List<int> recoverySecret,
    List<int> salt,
    RecoveryEnvelopeContext context,
  ) => deriveKey(
    secret: recoverySecret,
    salt: salt,
    info: recoveryKeyInfo(context),
  );

  Future<Uint8List> deriveTrustedDeviceWrappingKey(
    List<int> transferSecret,
    List<int> salt,
    TrustedDeviceTransferContext context,
  ) => deriveKey(
    secret: transferSecret,
    salt: salt,
    info: trustedDeviceTransferKeyInfo(context),
  );

  Future<Uint8List> seal({
    required List<int> key,
    required List<int> nonce,
    required List<int> aad,
    required List<int> plaintext,
  }) async {
    _requireLength(key, 32, 'key');
    _requireLength(nonce, 12, 'nonce');
    final box = await _aesGcm.encrypt(
      plaintext,
      secretKey: SecretKey(key),
      nonce: nonce,
      aad: aad,
    );
    return Uint8List.fromList([...box.cipherText, ...box.mac.bytes]);
  }

  Future<Uint8List> open({
    required List<int> key,
    required List<int> nonce,
    required List<int> aad,
    required List<int> ciphertextAndTag,
  }) async {
    _requireLength(key, 32, 'key');
    _requireLength(nonce, 12, 'nonce');
    if (ciphertextAndTag.length < 16) {
      throw const FormatException('Invalid Sreadya AES-GCM ciphertext.');
    }
    final split = ciphertextAndTag.length - 16;
    final box = SecretBox(
      ciphertextAndTag.sublist(0, split),
      nonce: nonce,
      mac: Mac(ciphertextAndTag.sublist(split)),
    );
    final clear = await _aesGcm.decrypt(
      box,
      secretKey: SecretKey(key),
      aad: aad,
    );
    return Uint8List.fromList(clear);
  }

  Future<Uint8List> encryptSyncJson(
    List<int> vaultRootSecret,
    SyncEventCryptoContext context,
    Object? plaintext,
  ) async {
    final key = await deriveSyncEventKey(vaultRootSecret, context);
    return seal(
      key: key,
      nonce: context.nonce,
      aad: syncEventAad(context),
      plaintext: utf8.encode(jsonEncode(plaintext)),
    );
  }

  Future<Object?> decryptSyncJson(
    List<int> vaultRootSecret,
    SyncEventCryptoContext context,
    List<int> ciphertextAndTag,
  ) async {
    final key = await deriveSyncEventKey(vaultRootSecret, context);
    final clear = await open(
      key: key,
      nonce: context.nonce,
      aad: syncEventAad(context),
      ciphertextAndTag: ciphertextAndTag,
    );
    return jsonDecode(utf8.decode(clear));
  }
}
