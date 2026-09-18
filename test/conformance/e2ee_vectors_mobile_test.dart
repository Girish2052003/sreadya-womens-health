import 'dart:convert';
import 'dart:io';

import 'package:cryptography/cryptography.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sreadya/core/crypto/e2ee/e2ee_v1.dart';
import 'package:sreadya/features/sync/domain/sync_envelope.dart';

const _cryptoVectorPath = 'shared/crypto/interoperability-vectors/e2ee-v1.json';
const _syncVectorPath = 'shared/sync/conflict-vectors/v1.json';

void main() {
  group('mobile E2EE adapter uses shared crypto vectors', () {
    test('recovery, transfer, and sync derivations match v1 bytes', () async {
      final vector = await _loadObject(_cryptoVectorPath);
      final common = vector['common'] as Map<String, dynamic>;
      final crypto = E2eeV1Crypto();

      final recovery = vector['recoveryEnvelope'] as Map<String, dynamic>;
      final recoveryContext = RecoveryEnvelopeContext(
        accountId: common['accountId'] as String,
        vaultId: common['vaultId'] as String,
        keyEpoch: common['keyEpoch'] as int,
      );
      final recoveryKey = await crypto.deriveRecoveryWrappingKey(
        _hexBytes(recovery['ikmHex'] as String),
        _hexBytes(recovery['saltHex'] as String),
        recoveryContext,
      );
      expect(_hex(recoveryKey), recovery['derivedKeyHex']);
      expect(_hex(recoveryKeyInfo(recoveryContext)), recovery['infoHex']);
      expect(_hex(recoveryEnvelopeAad(recoveryContext)), recovery['aadHex']);
      final recoveredRoot = await crypto.open(
        key: recoveryKey,
        nonce: _hexBytes(recovery['nonceHex'] as String),
        aad: recoveryEnvelopeAad(recoveryContext),
        ciphertextAndTag: _hexBytes(recovery['ciphertextAndTagHex'] as String),
      );
      expect(_hex(recoveredRoot), recovery['plaintextHex']);

      final transfer = vector['trustedDeviceTransfer'] as Map<String, dynamic>;
      final transferContext = TrustedDeviceTransferContext(
        accountId: common['accountId'] as String,
        vaultId: common['vaultId'] as String,
        enrollmentId: transfer['enrollmentId'] as String,
        sourceDeviceId: transfer['sourceDeviceId'] as String,
        targetDeviceId: transfer['targetDeviceId'] as String,
        keyEpoch: common['keyEpoch'] as int,
      );
      final transferKey = await crypto.deriveTrustedDeviceWrappingKey(
        _hexBytes(transfer['ikmHex'] as String),
        _hexBytes(transfer['saltHex'] as String),
        transferContext,
      );
      expect(_hex(transferKey), transfer['derivedKeyHex']);
      expect(
        _hex(trustedDeviceTransferKeyInfo(transferContext)),
        transfer['infoHex'],
      );
      expect(
        _hex(trustedDeviceTransferAad(transferContext)),
        transfer['aadHex'],
      );
      final transferredRoot = await crypto.open(
        key: transferKey,
        nonce: _hexBytes(transfer['nonceHex'] as String),
        aad: trustedDeviceTransferAad(transferContext),
        ciphertextAndTag: _hexBytes(transfer['ciphertextAndTagHex'] as String),
      );
      expect(_hex(transferredRoot), transfer['plaintextHex']);

      final event = vector['syncEvent'] as Map<String, dynamic>;
      final eventContext = SyncEventCryptoContext(
        accountId: common['accountId'] as String,
        vaultId: common['vaultId'] as String,
        keyEpoch: common['keyEpoch'] as int,
        objectId: event['objectId'] as String,
        eventId: event['eventId'] as String,
        sourceDeviceId: event['sourceDeviceId'] as String,
        schemaId: event['schema'] as String,
        baseRevision: event['baseRevision'] as int,
        operation: event['operation'] as String,
        kdfSalt: _hexBytes(event['saltHex'] as String),
        nonce: _hexBytes(event['nonceHex'] as String),
      );
      final eventKey = await crypto.deriveSyncEventKey(
        _hexBytes(event['ikmHex'] as String),
        eventContext,
      );
      expect(_hex(eventKey), event['derivedKeyHex']);
      expect(_hex(syncEventKeyInfo(eventContext)), event['infoHex']);
      expect(_hex(syncEventAad(eventContext)), event['aadHex']);
      final clear = await crypto.decryptSyncJson(
        _hexBytes(event['ikmHex'] as String),
        eventContext,
        _hexBytes(event['ciphertextAndTagHex'] as String),
      );
      expect(jsonEncode(clear), event['plaintextUtf8']);
    });

    test(
      'device-auth transcript remains byte-identical and verifies',
      () async {
        final vector = await _loadObject(_cryptoVectorPath);
        final entry = vector['deviceAuthentication'] as Map<String, dynamic>;
        final transcript = deviceAuthenticationTranscript(
          accountId: entry['accountId'] as String,
          deviceId: entry['deviceId'] as String,
          method: entry['method'] as String,
          path: entry['path'] as String,
          challenge: entry['challenge'] as String,
          bodySha256Hex: entry['bodySha256Hex'] as String,
        );
        expect(_hex(transcript), entry['transcriptHex']);
        final signature = Signature(
          _hexBytes(entry['signatureHex'] as String),
          publicKey: SimplePublicKey(
            _hexBytes(entry['publicKeyHex'] as String),
            type: KeyPairType.ed25519,
          ),
        );
        expect(
          await Ed25519().verify(transcript, signature: signature),
          isTrue,
        );
      },
    );
  });

  group('mobile sync adapter uses shared conflict vectors', () {
    test(
      'duplicate event decisions preserve idempotency and integrity',
      () async {
        final vector = await _loadObject(_syncVectorPath);
        final cases = (vector['cases'] as List<dynamic>)
            .cast<Map<String, dynamic>>();
        final same = cases.singleWhere(
          (entry) => entry['id'] == 'idempotent-byte-equivalent-retry',
        );
        final sameInput = same['input'] as Map<String, dynamic>;
        expect(
          SyncConflictPolicy.duplicateEvent(
            existingEventId: sameInput['existingEventId'] as String,
            existingEnvelopeDigest:
                sameInput['existingEnvelopeDigest'] as String,
            retryEventId: sameInput['retryEventId'] as String,
            retryEnvelopeDigest: sameInput['retryEnvelopeDigest'] as String,
          ),
          DuplicateEventDecision.returnExistingAcknowledgement,
        );

        final changed = cases.singleWhere(
          (entry) => entry['id'] == 'duplicate-event-mutated-envelope',
        );
        final changedInput = changed['input'] as Map<String, dynamic>;
        expect(
          SyncConflictPolicy.duplicateEvent(
            existingEventId: changedInput['existingEventId'] as String,
            existingEnvelopeDigest:
                changedInput['existingEnvelopeDigest'] as String,
            retryEventId: changedInput['retryEventId'] as String,
            retryEnvelopeDigest: changedInput['retryEnvelopeDigest'] as String,
          ),
          DuplicateEventDecision.rejectIntegrityProtocolViolation,
        );
      },
    );

    test(
      'stale revisions require client resolution and suites fail closed',
      () async {
        final vector = await _loadObject(_syncVectorPath);
        final cases = (vector['cases'] as List<dynamic>)
            .cast<Map<String, dynamic>>();
        final stale = cases.singleWhere(
          (entry) => entry['id'] == 'stale-base-revision',
        );
        final staleInput = stale['input'] as Map<String, dynamic>;
        final staleEvent = staleInput['event'] as Map<String, dynamic>;
        expect(
          SyncConflictPolicy.needsClientResolution(
            serverRevision: staleInput['serverRevision'] as int,
            baseRevision: staleEvent['baseRevision'] as int,
          ),
          isTrue,
        );

        final downgrade = cases.singleWhere(
          (entry) => entry['id'] == 'unsupported-suite-downgrade',
        );
        final downgradeInput = downgrade['input'] as Map<String, dynamic>;
        expect(
          SyncConflictPolicy.acceptsSuite(
            downgradeInput['requestedSuite'] as String,
          ),
          isFalse,
        );
        expect(SyncConflictPolicy.acceptsSuite(sreadyaE2eeSuiteV1), isTrue);
      },
    );
  });
}

Future<Map<String, dynamic>> _loadObject(String path) async {
  final decoded = jsonDecode(await File(path).readAsString());
  if (decoded is! Map<String, dynamic>) {
    throw FormatException('Expected JSON object at $path.');
  }
  return decoded;
}

List<int> _hexBytes(String value) {
  if (value.length.isOdd) throw const FormatException('Invalid hex length.');
  return [
    for (var index = 0; index < value.length; index += 2)
      int.parse(value.substring(index, index + 2), radix: 16),
  ];
}

String _hex(List<int> bytes) =>
    bytes.map((value) => value.toRadixString(16).padLeft(2, '0')).join();
