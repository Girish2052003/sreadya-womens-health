import '../../lib/features/cycle/domain/cycle_models.dart';

class FakeHealthRepository implements HealthRepository {
  final List<PeriodEpisode> periods = <PeriodEpisode>[];
  final List<HealthObservation> observations = <HealthObservation>[];

  @override
  Future<void> deleteObservation(String id) async {
    observations.removeWhere((value) => value.id == id);
  }

  @override
  Future<void> deletePeriod(String id) async {
    periods.removeWhere((value) => value.id == id);
  }

  @override
  Future<List<HealthObservation>> listObservations({DateTime? from, DateTime? to}) async => observations
      .where((value) => (from == null || !value.occurredAt.isBefore(from)) && (to == null || !value.occurredAt.isAfter(to)))
      .toList(growable: false);

  @override
  Future<List<PeriodEpisode>> listPeriods() async => List<PeriodEpisode>.unmodifiable(periods);

  @override
  Future<void> saveObservation(HealthObservation observation) async {
    observations.removeWhere((value) => value.id == observation.id);
    observations.add(observation);
  }

  @override
  Future<void> savePeriod(PeriodEpisode episode) async {
    periods.removeWhere((value) => value.id == episode.id);
    periods.add(episode);
  }

  @override
  Future<void> replaceAll({
    required List<PeriodEpisode> periods,
    required List<HealthObservation> observations,
  }) async {
    this.periods
      ..clear()
      ..addAll(periods);
    this.observations
      ..clear()
      ..addAll(observations);
  }

  @override
  Stream<void> watchChanges() => const Stream<void>.empty();
}
