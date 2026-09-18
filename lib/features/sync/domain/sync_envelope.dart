import 'dart:convert';
import 'dart:typed_data';

import '../../../core/crypto/e2ee/e2ee_v1.dart';

class CommittedSyncChange {
  const CommittedSyncChange({
    required this.accountId,
    required this.vaultId,
    required this.keyEpoch,
    required this.objectId,
    required this.sourceDeviceId,
    required this.schemaId,
    required this.baseRevision,
    required this.operation,
  });

  final String accountId;
  final String vaultId;
  final int keyEpoch;
  final String objectId;
  final String sourceDeviceId;
  final String schemaId;
  final int baseRevision;
  final String operation;
}

class MobileSyncEnvelope {
  MobileSyncEnvelope({
    required this.context,
    required List<int> ciphertextAndTag,
    required this.createdAt,
    this.committedRevision,
    this.conflict = false,
  }) : ciphertextAndTag = Uint8List.fromList(ciphertextAndTag);

  final SyncEventCryptoContext context;
  final Uint8List ciphertextAndTag;
  final DateTime createdAt;
  final int? committedRevision;
  final bool conflict;

  Map<String, Object?> toWireJson() => {
    'protocol_version': context.protocolVersion,
    'suite_id': context.suiteId,
    'account_id': context.accountId,
    'vault_id': context.vaultId,
    'key_epoch': context.keyEpoch,
    'object_id': context.objectId,
    'event_id': context.eventId,
    'source_device_id': context.sourceDeviceId,
    'schema_id': context.schemaId,
    'base_revision': context.baseRevision,
    'operation': context.operation,
    'kdf_salt': base64Encode(context.kdfSalt),
    'nonce': base64Encode(context.nonce),
    'ciphertext_and_tag': base64Encode(ciphertextAndTag),
    'created_at': createdAt.toUtc().toIso8601String(),
    if (committedRevision != null) 'committed_revision': committedRevision,
    if (committedRevision != null) 'conflict': conflict,
  };

  factory MobileSyncEnvelope.fromWireJson(Map<String, Object?> json) {
    String text(String key) {
      final value = json[key];
      if (value is! String || value.isEmpty) {
        throw FormatException('Invalid Sreadya sync envelope field: $key');
      }
      return value;
    }

    int integer(String key) {
      final value = json[key];
      if (value is! int) {
        throw FormatException('Invalid Sreadya sync envelope field: $key');
      }
      return value;
    }

    Uint8List bytes(String key) {
      try {
        return Uint8List.fromList(base64Decode(text(key)));
      } on FormatException {
        throw FormatException('Invalid Sreadya sync envelope encoding: $key');
      }
    }

    final createdAt = DateTime.tryParse(text('created_at'));
    if (createdAt == null) {
      throw const FormatException('Invalid Sreadya sync creation timestamp.');
    }
    final committed = json['committed_revision'];
    final conflict = json['conflict'];
    return MobileSyncEnvelope(
      context: SyncEventCryptoContext(
        protocolVersion: integer('protocol_version'),
        suiteId: text('suite_id'),
        accountId: text('account_id'),
        vaultId: text('vault_id'),
        keyEpoch: integer('key_epoch'),
        objectId: text('object_id'),
        eventId: text('event_id'),
        sourceDeviceId: text('source_device_id'),
        schemaId: text('schema_id'),
        baseRevision: integer('base_revision'),
        operation: text('operation'),
        kdfSalt: bytes('kdf_salt'),
        nonce: bytes('nonce'),
      ),
      ciphertextAndTag: bytes('ciphertext_and_tag'),
      createdAt: createdAt,
      committedRevision: committed == null ? null : committed as int,
      conflict: conflict == null ? false : conflict as bool,
    );
  }
}

enum DuplicateEventDecision {
  newEvent,
  returnExistingAcknowledgement,
  rejectIntegrityProtocolViolation,
}

class SyncConflictPolicy {
  const SyncConflictPolicy._();

  static DuplicateEventDecision duplicateEvent({
    required String? existingEventId,
    required String? existingEnvelopeDigest,
    required String retryEventId,
    required String retryEnvelopeDigest,
  }) {
    if (existingEventId == null || existingEventId != retryEventId) {
      return DuplicateEventDecision.newEvent;
    }
    if (existingEnvelopeDigest == retryEnvelopeDigest) {
      return DuplicateEventDecision.returnExistingAcknowledgement;
    }
    return DuplicateEventDecision.rejectIntegrityProtocolViolation;
  }

  static bool needsClientResolution({
    required int serverRevision,
    required int baseRevision,
  }) => baseRevision != serverRevision;

  static bool acceptsSuite(String suiteId) => suiteId == sreadyaE2eeSuiteV1;

  static List<MobileSyncEnvelope> orderByRevisionGraph(
    Iterable<MobileSyncEnvelope> events,
  ) {
    final output = events.toList();
    output.sort((left, right) {
      final leftRevision = left.committedRevision ?? 0;
      final rightRevision = right.committedRevision ?? 0;
      final byRevision = leftRevision.compareTo(rightRevision);
      if (byRevision != 0) return byRevision;
      return left.context.eventId.compareTo(right.context.eventId);
    });
    return output;
  }
}
