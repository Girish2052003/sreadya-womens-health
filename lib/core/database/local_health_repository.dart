import 'dart:async';
import 'dart:typed_data';

import '../../features/cycle/domain/cycle_models.dart';
import '../crypto/vault_cipher.dart';
import 'health_vault.dart';

class LocalHealthRepository implements HealthRepository {
  LocalHealthRepository({
    required HealthVault vault,
    required VaultCipher cipher,
  })  : _vault = vault,
        _cipher = cipher;

  final HealthVault _vault;
  final VaultCipher _cipher;
  final StreamController<void> _changes = StreamController<void>.broadcast();

  @override
  Stream<void> watchChanges() => _changes.stream;

  @override
  Future<List<PeriodEpisode>> listPeriods() async {
    final rows = _vault.database.select(
      "SELECT payload FROM encrypted_records WHERE record_class='period';",
    );
    final result = <PeriodEpisode>[];
    for (final row in rows) {
      final json = await _cipher.decryptJson(row['payload'] as Uint8List);
      result.add(_periodFromJson(json));
    }
    result.sort((a, b) => a.start.compareTo(b.start));
    return result;
  }

  @override
  Future<void> savePeriod(PeriodEpisode episode) async {
    final existing = await listPeriods();
    for (final period in existing.where((p) => p.id != episode.id)) {
      final aEnd = episode.end ?? episode.start;
      final bEnd = period.end ?? period.start;
      final overlaps = !aEnd.isBefore(period.start) && !bEnd.isBefore(episode.start);
      if (overlaps) {
        throw StateError('Period episodes cannot overlap without an explicit merge.');
      }
    }
    await _upsert(episode.id, 'period', _periodToJson(episode));
  }

  @override
  Future<void> deletePeriod(String id) async {
    _vault.database.execute('DELETE FROM encrypted_records WHERE id = ?;', [id]);
    _changes.add(null);
  }

  @override
  Future<List<HealthObservation>> listObservations({DateTime? from, DateTime? to}) async {
    final rows = _vault.database.select(
      "SELECT payload FROM encrypted_records WHERE record_class='observation';",
    );
    final result = <HealthObservation>[];
    for (final row in rows) {
      final json = await _cipher.decryptJson(row['payload'] as Uint8List);
      final value = _observationFromJson(json);
      if (from != null && value.occurredAt.isBefore(from)) continue;
      if (to != null && value.occurredAt.isAfter(to)) continue;
      result.add(value);
    }
    result.sort((a, b) => a.occurredAt.compareTo(b.occurredAt));
    return result;
  }

  @override
  Future<void> saveObservation(HealthObservation observation) =>
      _upsert(observation.id, 'observation', _observationToJson(observation));

  @override
  Future<void> deleteObservation(String id) async {
    _vault.database.execute('DELETE FROM encrypted_records WHERE id = ?;', [id]);
    _changes.add(null);
  }

  @override
  Future<void> replaceAll({
    required List<PeriodEpisode> periods,
    required List<HealthObservation> observations,
  }) async {
    _validatePeriodSet(periods);

    // Encryption is intentionally completed before the SQLite transaction so
    // the transaction remains short and cannot be suspended across awaits.
    final periodRows = <(String, Uint8List)>[];
    for (final period in periods) {
      periodRows.add((period.id, await _cipher.encryptJson(_periodToJson(period))));
    }
    final observationRows = <(String, Uint8List)>[];
    for (final observation in observations) {
      observationRows.add((observation.id, await _cipher.encryptJson(_observationToJson(observation))));
    }

    final database = _vault.database;
    database.execute('BEGIN IMMEDIATE;');
    try {
      database.execute('DELETE FROM encrypted_records;');
      final now = DateTime.now().toUtc().toIso8601String();
      for (final row in periodRows) {
        database.execute(
          'INSERT INTO encrypted_records(id, record_class, payload, updated_at) VALUES(?, ?, ?, ?);',
          [row.$1, 'period', row.$2, now],
        );
      }
      for (final row in observationRows) {
        database.execute(
          'INSERT INTO encrypted_records(id, record_class, payload, updated_at) VALUES(?, ?, ?, ?);',
          [row.$1, 'observation', row.$2, now],
        );
      }
      final integrity = database.select('PRAGMA integrity_check;');
      if (integrity.isEmpty || integrity.first.values.first.toString().toLowerCase() != 'ok') {
        throw StateError('Health Vault integrity check failed during atomic replacement.');
      }
      database.execute('COMMIT;');
    } catch (_) {
      database.execute('ROLLBACK;');
      rethrow;
    }
    _changes.add(null);
  }

  void _validatePeriodSet(List<PeriodEpisode> periods) {
    final ordered = [...periods]..sort((a, b) => a.start.compareTo(b.start));
    for (var i = 1; i < ordered.length; i++) {
      final previous = ordered[i - 1];
      final previousEnd = previous.end ?? previous.start;
      if (!previousEnd.isBefore(ordered[i].start)) {
        throw StateError('Restored period episodes overlap.');
      }
    }
  }

  Future<void> _upsert(String id, String recordClass, Map<String, Object?> json) async {
    final encrypted = await _cipher.encryptJson(json);
    _vault.database.execute(
      '''
      INSERT INTO encrypted_records(id, record_class, payload, updated_at)
      VALUES(?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        record_class=excluded.record_class,
        payload=excluded.payload,
        updated_at=excluded.updated_at;
      ''',
      [id, recordClass, encrypted, DateTime.now().toUtc().toIso8601String()],
    );
    _changes.add(null);
  }

  Map<String, Object?> _periodToJson(PeriodEpisode value) => {
        'id': value.id,
        'start': value.start.toIso8601String(),
        'end': value.end?.toIso8601String(),
        'source': value.source.name,
        'externalId': value.externalId,
      };

  PeriodEpisode _periodFromJson(Map<String, dynamic> json) => PeriodEpisode(
        id: json['id'] as String,
        start: DateTime.parse(json['start'] as String),
        end: json['end'] == null ? null : DateTime.parse(json['end'] as String),
        source: RecordSource.values.byName(json['source'] as String? ?? 'app'),
        externalId: json['externalId'] as String?,
      );

  Map<String, Object?> _observationToJson(HealthObservation value) => {
        'id': value.id,
        'kind': value.kind.name,
        'occurredAt': value.occurredAt.toIso8601String(),
        'severity': value.severity?.name,
        'numericValue': value.numericValue,
        'unit': value.unit,
        'label': value.label,
        'note': value.note,
        'flowLevel': value.flowLevel?.name,
        'source': value.source.name,
        'externalId': value.externalId,
      };

  HealthObservation _observationFromJson(Map<String, dynamic> json) => HealthObservation(
        id: json['id'] as String,
        kind: ObservationKind.values.byName(json['kind'] as String),
        occurredAt: DateTime.parse(json['occurredAt'] as String),
        severity: json['severity'] == null
            ? null
            : ObservationSeverity.values.byName(json['severity'] as String),
        numericValue: (json['numericValue'] as num?)?.toDouble(),
        unit: json['unit'] as String?,
        label: json['label'] as String?,
        note: json['note'] as String?,
        flowLevel: json['flowLevel'] == null ? null : FlowLevel.values.byName(json['flowLevel'] as String),
        source: RecordSource.values.byName(json['source'] as String? ?? 'app'),
        externalId: json['externalId'] as String?,
      );
}
