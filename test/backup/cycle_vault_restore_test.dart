import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:sreva/features/backup/data/cycle_vault_service.dart';
import 'package:sreva/features/backup/domain/restore_transaction.dart';
import 'package:sreva/features/cycle/domain/cycle_models.dart';

void main() {
  const passphrase = 'correct horse battery staple';

  test('failed staged restore never replaces the live repository', () async {
    final live = _MemoryStore(periodIds: ['live']);
    final staged = _MemoryStore(periodIds: ['restored'], valid: false);
    final coordinator = RestoreTransactionCoordinator<_MemoryStore>();

    await expectLater(
      coordinator.commit(
        live: live,
        staged: staged,
        validate: (store) async => store.valid,
        replaceLive: (store) async => live.replacedWith = store,
      ),
      throwsStateError,
    );

    expect(live.replacedWith, isNull);
    expect(live.periodIds, ['live']);
  });

  test(
    'valid staged restore is the only state passed to atomic replacement',
    () async {
      final live = _MemoryStore(periodIds: ['live']);
      final staged = _MemoryStore(periodIds: ['restored']);
      final coordinator = RestoreTransactionCoordinator<_MemoryStore>();

      await coordinator.commit(
        live: live,
        staged: staged,
        validate: (store) async => store.valid,
        replaceLive: (store) async => live.replacedWith = store,
      );

      expect(live.replacedWith, same(staged));
    },
  );

  test(
    'CycleVault encrypted bytes round-trip periods and observations',
    () async {
      final source = _MemoryRepository(
        periods: [
          PeriodEpisode(
            id: 'p1',
            start: DateTime(2026, 8, 1),
            end: DateTime(2026, 8, 4),
          ),
        ],
        observations: [
          HealthObservation(
            id: 'o1',
            kind: ObservationKind.cramps,
            occurredAt: DateTime(2026, 8, 1, 9),
            severity: ObservationSeverity.moderate,
            label: 'Cramps',
          ),
        ],
      );
      final bytes = await CycleVaultService(repository: source)
          .exportBytes(passphrase);
      final target = _MemoryRepository(
        periods: [PeriodEpisode(id: 'old', start: DateTime(2026, 1, 1))],
      );

      final result = await CycleVaultService(repository: target)
          .restoreBytes(bytes, passphrase);

      expect(result.periods, 1);
      expect(result.observations, 1);
      expect(target.periods.single.id, 'p1');
      expect(target.observations.single.id, 'o1');
      expect(target.periods.single.source, RecordSource.cycleVault);
      expect(target.observations.single.source, RecordSource.cycleVault);
    },
  );

  test('wrong CycleVault passphrase cannot replace live health data', () async {
    final source = _MemoryRepository(
      periods: [PeriodEpisode(id: 'p1', start: DateTime(2026, 8, 1))],
    );
    final bytes = await CycleVaultService(repository: source)
        .exportBytes(passphrase);
    final target = _MemoryRepository(
      periods: [PeriodEpisode(id: 'live', start: DateTime(2026, 7, 1))],
    );

    await expectLater(
      CycleVaultService(repository: target)
          .restoreBytes(bytes, 'definitely the wrong passphrase'),
      throwsA(anything),
    );
    expect(target.periods.single.id, 'live');
  });

  test(
    'tampered CycleVault ciphertext is rejected without replacement',
    () async {
      final source = _MemoryRepository(
        periods: [PeriodEpisode(id: 'p1', start: DateTime(2026, 8, 1))],
      );
      final bytes = await CycleVaultService(repository: source)
          .exportBytes(passphrase);
      final outer = jsonDecode(utf8.decode(bytes)) as Map<String, dynamic>;
      final sealed = base64Decode(outer['sealedPayload'] as String);
      sealed[sealed.length ~/ 2] ^= 0x01;
      outer['sealedPayload'] = base64Encode(sealed);
      final tampered = utf8.encode(jsonEncode(outer));
      final target = _MemoryRepository(
        periods: [PeriodEpisode(id: 'live', start: DateTime(2026, 7, 1))],
      );

      await expectLater(
        CycleVaultService(repository: target)
            .restoreBytes(tampered, passphrase),
        throwsA(anything),
      );
      expect(target.periods.single.id, 'live');
    },
  );

  test(
    'unsupported CycleVault format is rejected before replacement',
    () async {
      final source = _MemoryRepository(
        periods: [PeriodEpisode(id: 'p1', start: DateTime(2026, 8, 1))],
      );
      final bytes = await CycleVaultService(repository: source)
          .exportBytes(passphrase);
      final outer = jsonDecode(utf8.decode(bytes)) as Map<String, dynamic>;
      final manifest = Map<String, dynamic>.from(outer['manifest'] as Map);
      manifest['formatVersion'] = 999;
      outer['manifest'] = manifest;
      final unsupported = utf8.encode(jsonEncode(outer));
      final target = _MemoryRepository(
        periods: [PeriodEpisode(id: 'live', start: DateTime(2026, 7, 1))],
      );

      await expectLater(
        CycleVaultService(repository: target)
            .restoreBytes(unsupported, passphrase),
        throwsFormatException,
      );
      expect(target.periods.single.id, 'live');
    },
  );

  test(
    'domain-invalid decrypted CycleVault never replaces live data',
    () async {
      final source = _MemoryRepository(
        periods: [
          PeriodEpisode(
            id: 'p1',
            start: DateTime(2026, 8, 1),
            end: DateTime(2026, 8, 4),
          ),
          PeriodEpisode(
            id: 'p2',
            start: DateTime(2026, 8, 3),
            end: DateTime(2026, 8, 6),
          ),
        ],
      );
      final bytes = await CycleVaultService(repository: source)
          .exportBytes(passphrase);
      final target = _MemoryRepository(
        periods: [PeriodEpisode(id: 'live', start: DateTime(2026, 7, 1))],
      );

      await expectLater(
        CycleVaultService(repository: target).restoreBytes(bytes, passphrase),
        throwsStateError,
      );
      expect(target.periods.single.id, 'live');
    },
  );
}

class _MemoryStore {
  _MemoryStore({required this.periodIds, this.valid = true});
  final List<String> periodIds;
  final bool valid;
  _MemoryStore? replacedWith;
}

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
