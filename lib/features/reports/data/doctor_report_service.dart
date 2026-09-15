import 'dart:convert';
import 'dart:io';

import 'package:intl/intl.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:pdf/widgets.dart' as pw;

import '../../cycle/domain/cycle_models.dart';
import '../domain/report_selection.dart';

class DoctorReportService {
  DoctorReportService({required HealthRepository repository}) : _repository = repository;

  final HealthRepository _repository;

  Future<String> generatePdf({
    required DateTime from,
    required DateTime to,
    required ReportSelection selection,
  }) async {
    final periods = await _repository.listPeriods();
    final observations = await _repository.listObservations(from: from, to: to);
    final doc = pw.Document();
    final date = DateFormat.yMMMd();
    doc.addPage(
      pw.MultiPage(
        build: (_) => [
          pw.Text(
            'Sreva cycle history report',
            style: pw.TextStyle(fontSize: 22, fontWeight: pw.FontWeight.bold),
          ),
          pw.SizedBox(height: 8),
          pw.Text('${date.format(from)} – ${date.format(to)}'),
          pw.Text('Generated locally on the user’s device. This report is not a diagnosis.'),
          pw.SizedBox(height: 16),
          if (selection.categories.contains(ReportCategory.periods)) ...[
            pw.Text(
              'Periods',
              style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold),
            ),
            ...periods
                .where((value) => !value.start.isBefore(from) && !value.start.isAfter(to))
                .map(
                  (value) => pw.Text(
                    '${date.format(value.start)}${value.end == null ? ' – ongoing' : ' – ${date.format(value.end!)} (${value.durationDays} days)'}',
                  ),
                ),
            pw.SizedBox(height: 12),
          ],
          pw.Text(
            'Selected observations',
            style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold),
          ),
          ...observations.where((value) => _include(value, selection)).map(
                (value) => pw.Text(_humanObservation(value, selection, date)),
              ),
        ],
      ),
    );

    final directory = await getTemporaryDirectory();
    final file = File(p.join(directory.path, 'sreva-health-report.pdf'));
    await file.writeAsBytes(await doc.save(), flush: true);
    return file.path;
  }

  /// Generates a CSV report. When [writeFile] is false the CSV text itself is
  /// returned, which keeps privacy-selection behavior directly unit-testable.
  Future<String> generateCsv({
    required DateTime from,
    required DateTime to,
    required ReportSelection selection,
    bool writeFile = true,
  }) async {
    final periods = await _repository.listPeriods();
    final observations = await _repository.listObservations(from: from, to: to);
    final rows = <List<String>>[
      ['record_type', 'date', 'kind', 'value', 'note'],
      if (selection.categories.contains(ReportCategory.periods))
        ...periods
            .where((value) => !value.start.isBefore(from) && !value.start.isAfter(to))
            .map(
              (value) => [
                'period',
                value.start.toIso8601String(),
                'period',
                value.end?.toIso8601String() ?? 'ongoing',
                '',
              ],
            ),
      ...observations.where((value) => _include(value, selection)).map(
            (value) => [
              'observation',
              value.occurredAt.toIso8601String(),
              value.label ?? value.kind.name,
              value.flowLevel?.name ??
                  value.severity?.name ??
                  value.numericValue?.toString() ??
                  '',
              selection.categories.contains(ReportCategory.privateNotes)
                  ? value.note ?? ''
                  : '',
            ],
          ),
    ];
    final csv = rows.map((row) => row.map(_csvCell).join(',')).join('\n');
    if (!writeFile) return csv;

    final directory = await getTemporaryDirectory();
    final file = File(p.join(directory.path, 'sreva-health-report.csv'));
    await file.writeAsString(csv, encoding: utf8, flush: true);
    return file.path;
  }

  bool _include(HealthObservation observation, ReportSelection selection) {
    if (observation.kind == ObservationKind.sexualActivity) {
      return selection.categories.contains(ReportCategory.sexualActivity);
    }
    return switch (observation.kind) {
      ObservationKind.menstrualFlow => selection.categories.contains(ReportCategory.flow),
      ObservationKind.medication || ObservationKind.supplement =>
        selection.categories.contains(ReportCategory.medications),
      ObservationKind.basalBodyTemperature =>
        selection.categories.contains(ReportCategory.temperature),
      ObservationKind.ovulationTest || ObservationKind.cervicalMucus =>
        selection.categories.contains(ReportCategory.ovulation),
      ObservationKind.cramps ||
      ObservationKind.backPain ||
      ObservationKind.headache ||
      ObservationKind.migraine => selection.categories.contains(ReportCategory.pain),
      _ => selection.categories.contains(ReportCategory.symptoms),
    };
  }

  String _humanObservation(
    HealthObservation observation,
    ReportSelection selection,
    DateFormat date,
  ) {
    final value = observation.flowLevel?.name ??
        observation.severity?.name ??
        observation.numericValue?.toString() ??
        '';
    final note = selection.categories.contains(ReportCategory.privateNotes) &&
            observation.note != null
        ? ' · ${observation.note}'
        : '';
    return '${date.format(observation.occurredAt)} · ${observation.label ?? observation.kind.name} · $value$note';
  }

  String _csvCell(String value) => '"${value.replaceAll('"', '""')}"';
}
