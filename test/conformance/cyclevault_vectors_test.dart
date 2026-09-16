import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:cryptography/cryptography.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sreva/features/backup/data/cycle_vault_service.dart';
import 'package:sreva/features/cycle/domain/cycle_models.dart';

const _vectorPath = 'shared/crypto/interoperability-vectors/cyclevault-v1.json';

void main() {
  test(
    'independent CycleVault v1 vector matches Dart Argon2id parameters',
    () async {
      final vector = await _loadVector();
      final key =
          await Argon2id(
            memory: 19 * 1024,
            parallelism: 1,
            iterations: 2,
            hashLength: 32,
          ).deriveKeyFromPassword(
            password: vector['passphrase'] as String,
            nonce: base64Decode(vector['saltBase64'] as String),
          );
      final keyBytes = await key.extractBytes();

      expect(_hex(keyBytes), vector['derivedKeyHex']);
      expect(jsonEncode(vector['manifest']), vector['manifestJson']);
    },
  );

  test(
    'independent CycleVault v1 vector decrypts through production Dart restore',
    () async {
      final vector = await _loadVector();
      final target = _MemoryRepository(
        periods: [
          PeriodEpisode(
            id: 'live-before-vector',
            start: DateTime.utc(2026, 7, 1),
          ),
        ],
      );

      final result = await CycleVaultService(repository: target).restoreBytes(
        utf8.encode(vector['containerJson'] as String),
        vector['passphrase'] as String,
      );

      expect(result.periods, 1);
      expect(result.observations, 1);
      expect(target.periods.single.id, 'p-vector-1');
      expect(
        target.periods.single.start.toUtc().toIso8601String(),
        '2026-08-01T00:00:00.000Z',
      );
      expect(
        target.periods.single.end?.toUtc().toIso8601String(),
        '2026-08-04T00:00:00.000Z',
      );
      expect(target.periods.single.source, RecordSource.cycleVault);
      expect(target.observations.single.id, 'o-vector-1');
      expect(target.observations.single.kind, ObservationKind.cramps);
      expect(target.observations.single.severity, ObservationSeverity.moderate);
      expect(target.observations.single.source, RecordSource.cycleVault);
    },
  );

  test(
    'wrong passphrase and ciphertext tamper preserve live Dart vault',
    () async {
      final vector = await _loadVector();

      final wrongPassTarget = _MemoryRepository(
        periods: [
          PeriodEpisode(id: 'live-wrong-pass', start: DateTime.utc(2026, 7, 1)),
        ],
      );
      await expectLater(
        CycleVaultService(repository: wrongPassTarget).restoreBytes(
          utf8.encode(vector['containerJson'] as String),
          'definitely the wrong passphrase',
        ),
        throwsA(anything),
      );
      expect(wrongPassTarget.periods.single.id, 'live-wrong-pass');

      final outer =
          jsonDecode(vector['containerJson'] as String) as Map<String, dynamic>;
      final sealed = base64Decode(outer['sealedPayload'] as String);
      sealed[sealed.length ~/ 2] ^= 0x01;
      outer['sealedPayload'] = base64Encode(sealed);
      final tamperTarget = _MemoryRepository(
        periods: [
          PeriodEpisode(id: 'live-tamper', start: DateTime.utc(2026, 7, 2)),
        ],
      );
      await expectLater(
        CycleVaultService(repository: tamperTarget).restoreBytes(
          utf8.encode(jsonEncode(outer)),
          vector['passphrase'] as String,
        ),
        throwsA(anything),
      );
      expect(tamperTarget.periods.single.id, 'live-tamper');
    },
  );

  test('unsupported CycleVault schema is rejected before replacing live Dart vault', () async {
    final vector = await _loadVector();
    final outer =
        jsonDecode(vector['containerJson'] as String) as Map<String, dynamic>;
    final manifest = Map<String, dynamic>.from(outer['manifest'] as Map);
    manifest['formatVersion'] = 999;
    outer['manifest'] = manifest;
    final target = _MemoryRepository(
      periods: [
        PeriodEpisode(id: 'live-schema', start: DateTime.utc(2026, 7, 3)),
      ],
    );

    await expectLater(
      CycleVaultService(repository: target).restoreBytes(
        utf8.encode(jsonEncode(outer)),
        vector['passphrase'] as String,
      ),
      throwsFormatException,
    );
    expect(target.periods.single.id, 'live-schema');
  });
}

Future<Map<String, dynamic>> _loadVector() async {
  final decoded = jsonDecode(await File(_vectorPath).readAsString());
  if (decoded is! Map<String, dynamic>) {
    throw const FormatException(
      'CycleVault interoperability vector must be an object.',
    );
  }
  return decoded;
}

String _hex(List<int> bytes) =>
    bytes.map((value) => value.toRadixString(16).padLeft(2, '0')).join();

class _MemoryRepository implements HealthRepository {
  _MemoryRepository({
    List<PeriodEpisode>? periods,
    List<HealthObservation>? observations,
  }) : periods = [...?periods],
       observations = [...?observations];

  List<PeriodEpisode> periods;
  List<HealthObservation> observations;
  final StreamController<void> _changes = StreamController<void>.broadcast();

  @override
  Future<void> deleteObservation(String id) async {
    observations.removeWhere((value) => value.id == id);
    _changes.add(null);
  }

  @override
  Future<void> deletePeriod(String id) async {
    periods.removeWhere((value) => value.id == id);
    _changes.add(null);
  }

  @override
  Future<List<HealthObservation>> listObservations({
    DateTime? from,
    DateTime? to,
  }) async => observations
      .where((value) {
        if (from != null && value.occurredAt.isBefore(from)) return false;
        if (to != null && value.occurredAt.isAfter(to)) return false;
        return true;
      })
      .toList(growable: false);

  @override
  Future<List<PeriodEpisode>> listPeriods() async => List.unmodifiable(periods);

  @override
  Future<void> replaceAll({
    required List<PeriodEpisode> periods,
    required List<HealthObservation> observations,
  }) async {
    this.periods = [...periods];
    this.observations = [...observations];
    _changes.add(null);
  }

  @override
  Future<void> saveObservation(HealthObservation observation) async {
    observations.removeWhere((value) => value.id == observation.id);
    observations.add(observation);
    _changes.add(null);
  }

  @override
  Future<void> savePeriod(PeriodEpisode episode) async {
    periods.removeWhere((value) => value.id == episode.id);
    periods.add(episode);
    _changes.add(null);
  }

  @override
  Stream<void> watchChanges() => _changes.stream;
}
