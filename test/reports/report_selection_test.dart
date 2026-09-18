import 'package:flutter_test/flutter_test.dart';
import 'package:sreadya/features/cycle/domain/cycle_models.dart';
import 'package:sreadya/features/reports/data/doctor_report_service.dart';
import 'package:sreadya/features/reports/domain/report_selection.dart';

import '../support/fake_health_repository.dart';

void main() {
  final from = DateTime(2026, 9, 1);
  final to = DateTime(2026, 9, 30);

  test('default export excludes sexual activity and private notes', () async {
    final repository = FakeHealthRepository();
    repository.periods.add(
      PeriodEpisode(
        id: 'p1',
        start: DateTime(2026, 9, 1),
        end: DateTime(2026, 9, 5),
      ),
    );
    repository.observations.addAll([
      HealthObservation(
        id: 'pain',
        kind: ObservationKind.cramps,
        occurredAt: DateTime(2026, 9, 1),
        label: 'Cramps',
        note: 'private note',
      ),
      HealthObservation(
        id: 'sex',
        kind: ObservationKind.sexualActivity,
        occurredAt: DateTime(2026, 9, 2),
        label: 'Sexual activity',
        note: 'private sexual note',
      ),
    ]);

    final service = DoctorReportService(repository: repository);
    final csv = await service.generateCsv(
      from: from,
      to: to,
      selection: ReportSelection.safeDefault(),
      writeFile: false,
    );

    expect(csv, contains('Cramps'));
    expect(csv, isNot(contains('Sexual activity')));
    expect(csv, isNot(contains('private note')));
    expect(csv, isNot(contains('private sexual note')));
  });

  test('explicit sexual-activity selection includes category but omits notes unless selected', () async {
    final repository = FakeHealthRepository();
    repository.observations.add(
      HealthObservation(
        id: 'sex',
        kind: ObservationKind.sexualActivity,
        occurredAt: DateTime(2026, 9, 2),
        label: 'Sexual activity',
        note: 'private sexual note',
      ),
    );
    final service = DoctorReportService(repository: repository);
    final selection = ReportSelection(
      categories: {
        ...ReportSelection.safeDefault().categories,
        ReportCategory.sexualActivity,
      },
    );
    final csv = await service.generateCsv(
      from: from,
      to: to,
      selection: selection,
      writeFile: false,
    );
    expect(csv, contains('Sexual activity'));
    expect(csv, isNot(contains('private sexual note')));
  });
}
