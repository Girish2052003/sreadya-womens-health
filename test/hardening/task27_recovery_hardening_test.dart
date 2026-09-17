import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:sreva/features/backup/data/cycle_vault_service.dart';
import 'package:sreva/features/backup/domain/restore_transaction.dart';
import 'package:sreva/features/cycle/domain/cycle_models.dart';

void main() {
  const passphrase = 'task27 synthetic recovery passphrase';

  test('truncated CycleVault is rejected while existing information survives', () async {
    final source = _MemoryRepository(
      periods: [PeriodEpisode(id: 'synthetic-source', start: DateTime(2026, 8, 1))],
    );
    final bytes = await CycleVaultService(repository: source).exportBytes(passphrase);
    final truncated = bytes.sublist(0, bytes.length ~/ 2);
    final target = _MemoryRepository(
      periods: [PeriodEpisode(id: 'existing-information', start: DateTime(2026, 7, 1))],
    );

    await expectLater(
      CycleVaultService(repository: target).restoreBytes(truncated, passphrase),
      throwsA(anything),
    );
    expect(target.periods.single.id, 'existing-information');
  });

  test('corrupt CycleVault encoding is rejected while existing information survives', () async {
    final target = _MemoryRepository(
      periods: [PeriodEpisode(id: 'existing-information', start: DateTime(2026, 7, 1))],
    );
    final corrupt = utf8.encode('{"manifest":{"formatVersion":1},"sealedPayload":"%%%corrupt%%%"}');

    await expectLater(
      CycleVaultService(repository: target).restoreBytes(corrupt, passphrase),
      throwsA(anything),
    );
    expect(target.periods.single.id, 'existing-information');
  });

  test('future schema CycleVault is rejected before existing information changes', () async {
    final source = _MemoryRepository(
      periods: [PeriodEpisode(id: 'synthetic-source', start: DateTime(2026, 8, 1))],
    );
    final bytes = await CycleVaultService(repository: source).exportBytes(passphrase);
    final outer = jsonDecode(utf8.decode(bytes)) as Map<String, dynamic>;
    final manifest = Map<String, dynamic>.from(outer['manifest'] as Map);
    manifest['formatVersion'] = 999;
    outer['manifest'] = manifest;
    final futureSchema = utf8.encode(jsonEncode(outer));
    final target = _MemoryRepository(
      periods: [PeriodEpisode(id: 'existing-information', start: DateTime(2026, 7, 1))],
    );

    await expectLater(
      CycleVaultService(repository: target).restoreBytes(futureSchema, passphrase),
      throwsFormatException,
    );
    expect(target.periods.single.id, 'existing-information');
  });

  test('rollback leaves existing information untouched after staged validation failure', () async {
    final existing = _StagedStore('existing-information', valid: true);
    final candidate = _StagedStore('synthetic-corrupt-restore', valid: false);
    _StagedStore? replaced;
    final coordinator = RestoreTransactionCoordinator<_StagedStore>();

    await expectLater(
      coordinator.commit(
        live: existing,
        staged: candidate,
        validate: (store) async => store.valid,
        replaceLive: (store) async => replaced = store,
      ),
      throwsStateError,
    );

    expect(existing.label, 'existing-information');
    expect(replaced, isNull);
  });
}

class _StagedStore {
  _StagedStore(this.label, {required this.valid});

  final String label;
  final bool valid;
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
