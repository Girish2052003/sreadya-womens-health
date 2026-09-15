import 'package:uuid/uuid.dart';

import '../../cycle/domain/cycle_models.dart';

class HealthImportResult {
  const HealthImportResult({
    required this.periodsAdded,
    required this.observationsAdded,
    required this.duplicatesSkipped,
  });
  final int periodsAdded;
  final int observationsAdded;
  final int duplicatesSkipped;
}

class HealthImportService {
  HealthImportService({required HealthRepository repository}) : _repository = repository;
  final HealthRepository _repository;
  static const _uuid = Uuid();

  Future<HealthImportResult> importRecords(
    List<Map<String, Object?>> rows, {
    required RecordSource source,
  }) async {
    final existingPeriods = await _repository.listPeriods();
    final existingObservations = await _repository.listObservations();
    final externalIds = existingObservations.map((o) => o.externalId).whereType<String>().toSet();
    final flowDays = <({DateTime day, FlowLevel flow, String? externalId})>[];
    var observationsAdded = 0;
    var skipped = 0;

    for (final row in rows) {
      final millis = row['dateMillis'];
      if (millis is! num) continue;
      final local = DateTime.fromMillisecondsSinceEpoch(millis.toInt()).toLocal();
      final day = DateTime(local.year, local.month, local.day);
      final externalId = row['id']?.toString();
      if (externalId != null && externalIds.contains(externalId)) {
        skipped++;
        continue;
      }
      final type = row['type']?.toString();
      final observation = _observationFromRow(
        row,
        id: _uuid.v7(),
        occurredAt: day,
        source: source,
        externalId: externalId,
      );
      if (observation != null) {
        await _repository.saveObservation(observation);
        observationsAdded++;
        if (externalId != null) externalIds.add(externalId);
      }
      if (type == 'menstrualFlow') {
        final flow = _flow(row['value']?.toString());
        if (flow != null) flowDays.add((day: day, flow: flow, externalId: externalId));
      }
    }

    flowDays.sort((a, b) => a.day.compareTo(b.day));
    final groups = <List<DateTime>>[];
    for (final record in flowDays) {
      if (groups.isEmpty || record.day.difference(groups.last.last).inDays > 1) {
        groups.add([record.day]);
      } else if (!_sameDay(record.day, groups.last.last)) {
        groups.last.add(record.day);
      }
    }

    var periodsAdded = 0;
    for (final group in groups) {
      final start = group.first;
      final end = group.last;
      if (existingPeriods.any((period) => _sameDay(period.start, start))) {
        skipped++;
        continue;
      }
      final episode = PeriodEpisode(
        id: _uuid.v7(),
        start: start,
        end: end,
        source: source,
        externalId: 'platform-flow:${start.toIso8601String()}',
      );
      try {
        await _repository.savePeriod(episode);
        existingPeriods.add(episode);
        periodsAdded++;
      } on StateError {
        skipped++;
      }
    }

    return HealthImportResult(
      periodsAdded: periodsAdded,
      observationsAdded: observationsAdded,
      duplicatesSkipped: skipped,
    );
  }

  HealthObservation? _observationFromRow(
    Map<String, Object?> row, {
    required String id,
    required DateTime occurredAt,
    required RecordSource source,
    required String? externalId,
  }) {
    final type = row['type']?.toString();
    final value = row['value']?.toString();
    return switch (type) {
      'menstrualFlow' => _flow(value) == null
          ? null
          : HealthObservation(
              id: id,
              kind: ObservationKind.menstrualFlow,
              occurredAt: occurredAt,
              flowLevel: _flow(value),
              label: '${value ?? 'Menstrual'} flow',
              source: source,
              externalId: externalId,
            ),
      'intermenstrualBleeding' => HealthObservation(
          id: id,
          kind: ObservationKind.menstrualFlow,
          occurredAt: occurredAt,
          flowLevel: FlowLevel.spotting,
          label: 'Intermenstrual spotting',
          source: source,
          externalId: externalId,
        ),
      'basalBodyTemperature' => HealthObservation(
          id: id,
          kind: ObservationKind.basalBodyTemperature,
          occurredAt: occurredAt,
          numericValue: (row['numericValue'] as num?)?.toDouble(),
          unit: row['unit']?.toString() ?? '°C',
          label: 'Basal body temperature',
          source: source,
          externalId: externalId,
        ),
      'cervicalMucus' => HealthObservation(
          id: id,
          kind: ObservationKind.cervicalMucus,
          occurredAt: occurredAt,
          label: value ?? 'Cervical mucus',
          source: source,
          externalId: externalId,
        ),
      'ovulationTest' => HealthObservation(
          id: id,
          kind: ObservationKind.ovulationTest,
          occurredAt: occurredAt,
          label: value ?? 'Ovulation test',
          source: source,
          externalId: externalId,
        ),
      'pregnancyTest' => HealthObservation(
          id: id,
          kind: ObservationKind.pregnancyTest,
          occurredAt: occurredAt,
          label: value ?? 'Pregnancy test',
          source: source,
          externalId: externalId,
        ),
      'sexualActivity' => HealthObservation(
          id: id,
          kind: ObservationKind.sexualActivity,
          occurredAt: occurredAt,
          label: 'Sexual activity',
          source: source,
          externalId: externalId,
        ),
      _ => null,
    };
  }

  FlowLevel? _flow(String? value) => switch (value?.toLowerCase()) {
        'spotting' => FlowLevel.spotting,
        'light' => FlowLevel.light,
        'medium' || 'moderate' => FlowLevel.medium,
        'heavy' => FlowLevel.heavy,
        _ => null,
      };

  bool _sameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;
}
