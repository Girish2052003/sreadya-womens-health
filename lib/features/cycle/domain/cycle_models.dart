enum FlowLevel { spotting, light, medium, heavy }

enum ObservationSeverity { mild, moderate, severe }

enum RecordSource { app, healthKit, healthConnect, cycleVault }

enum ObservationKind {
  menstrualFlow,
  cramps,
  headache,
  migraine,
  backPain,
  breastTenderness,
  bloating,
  acne,
  nausea,
  digestion,
  fatigue,
  dizziness,
  appetite,
  cravings,
  sleep,
  energy,
  stress,
  mood,
  anxiety,
  irritability,
  libido,
  vaginalDischarge,
  cervicalMucus,
  basalBodyTemperature,
  weight,
  exercise,
  water,
  custom,
  ovulationTest,
  pregnancyTest,
  sexualActivity,
  protection,
  contraception,
  medication,
  supplement,
  dailyNote,
}

class PeriodEpisode {
  PeriodEpisode({
    required this.id,
    required this.start,
    this.end,
    this.source = RecordSource.app,
    this.externalId,
  }) : assert(end == null || !end.isBefore(start));

  final String id;
  final DateTime start;
  final DateTime? end;
  final RecordSource source;
  final String? externalId;

  int? get durationDays =>
      end == null ? null : end!.difference(start).inDays + 1;
}

class HealthObservation {
  const HealthObservation({
    required this.id,
    required this.kind,
    required this.occurredAt,
    this.severity,
    this.numericValue,
    this.unit,
    this.label,
    this.note,
    this.flowLevel,
    this.source = RecordSource.app,
    this.externalId,
  });

  final String id;
  final ObservationKind kind;
  final DateTime occurredAt;
  final ObservationSeverity? severity;
  final double? numericValue;
  final String? unit;
  final String? label;
  final String? note;
  final FlowLevel? flowLevel;
  final RecordSource source;
  final String? externalId;
}

abstract interface class HealthRepository {
  Future<List<PeriodEpisode>> listPeriods();
  Future<void> savePeriod(PeriodEpisode episode);
  Future<void> deletePeriod(String id);
  Future<List<HealthObservation>> listObservations({
    DateTime? from,
    DateTime? to,
  });
  Future<void> saveObservation(HealthObservation observation);
  Future<void> deleteObservation(String id);

  /// Replaces the complete local health dataset atomically. This is reserved
  /// for explicit restore/wipe flows; ordinary UI writes use the CRUD methods.
  Future<void> replaceAll({
    required List<PeriodEpisode> periods,
    required List<HealthObservation> observations,
  });

  Stream<void> watchChanges();
}
