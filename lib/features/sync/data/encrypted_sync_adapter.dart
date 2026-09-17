import 'dart:math';
import 'dart:typed_data';

import 'package:uuid/uuid.dart';

import '../../../core/crypto/e2ee/e2ee_v1.dart';
import '../domain/sync_envelope.dart';

abstract interface class VaultRootSecretProvider {
  Future<Uint8List> getVaultRootSecret(String vaultId, int keyEpoch);
}

abstract interface class EncryptedSyncOutbox {
  Future<void> enqueue(MobileSyncEnvelope envelope);
}

abstract interface class SyncRandomSource {
  String eventId();
  Uint8List salt();
  Uint8List nonce();
  DateTime now();
}

class SecureSyncRandomSource implements SyncRandomSource {
  SecureSyncRandomSource({Random? random, Uuid? uuid})
    : _random = random ?? Random.secure(),
      _uuid = uuid ?? const Uuid();

  final Random _random;
  final Uuid _uuid;

  Uint8List _bytes(int length) => Uint8List.fromList(
    List<int>.generate(length, (_) => _random.nextInt(256)),
  );

  @override
  String eventId() => _uuid.v4();

  @override
  Uint8List nonce() => _bytes(12);

  @override
  Uint8List salt() => _bytes(32);

  @override
  DateTime now() => DateTime.now().toUtc();
}

class EncryptedMobileSyncAdapter {
  EncryptedMobileSyncAdapter({
    required VaultRootSecretProvider rootSecretProvider,
    required EncryptedSyncOutbox encryptedOutbox,
    E2eeV1Crypto? crypto,
    SyncRandomSource? random,
  }) : _rootSecrets = rootSecretProvider,
       _outbox = encryptedOutbox,
       _crypto = crypto ?? E2eeV1Crypto(),
       _random = random ?? SecureSyncRandomSource();

  final VaultRootSecretProvider _rootSecrets;
  final EncryptedSyncOutbox _outbox;
  final E2eeV1Crypto _crypto;
  final SyncRandomSource _random;

  Future<MobileSyncEnvelope> observeCommittedLocalChange(
    CommittedSyncChange change,
    Object? plaintextSnapshot,
  ) async {
    final context = SyncEventCryptoContext(
      accountId: change.accountId,
      vaultId: change.vaultId,
      keyEpoch: change.keyEpoch,
      objectId: change.objectId,
      eventId: _random.eventId(),
      sourceDeviceId: change.sourceDeviceId,
      schemaId: change.schemaId,
      baseRevision: change.baseRevision,
      operation: change.operation,
      kdfSalt: _random.salt(),
      nonce: _random.nonce(),
    );
    final rootSecret = await _rootSecrets.getVaultRootSecret(
      change.vaultId,
      change.keyEpoch,
    );
    final ciphertext = await _crypto.encryptSyncJson(
      rootSecret,
      context,
      plaintextSnapshot,
    );
    final envelope = MobileSyncEnvelope(
      context: context,
      ciphertextAndTag: ciphertext,
      createdAt: _random.now(),
    );
    await _outbox.enqueue(envelope);
    return envelope;
  }

  Future<Object?> decryptPulledEnvelope(MobileSyncEnvelope envelope) async {
    final rootSecret = await _rootSecrets.getVaultRootSecret(
      envelope.context.vaultId,
      envelope.context.keyEpoch,
    );
    return _crypto.decryptSyncJson(
      rootSecret,
      envelope.context,
      envelope.ciphertextAndTag,
    );
  }
}
