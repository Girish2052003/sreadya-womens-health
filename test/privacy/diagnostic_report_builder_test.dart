import 'package:flutter_test/flutter_test.dart';
import 'package:sreva/core/diagnostics/diagnostic_report_builder.dart';

void main() {
  test('diagnostic report contains only allowlisted operational metadata', () {
    final builder = DiagnosticReportBuilder();
    final report = builder.build(
      appVersion: '1.0.0',
      platform: 'iOS',
      osVersion: '26',
      databaseSchema: 1,
      predictionEngine: 'prediction-v1',
      reminderEngine: 'reminder-v1',
      healthAdapter: 'health-v1',
      notificationPermission: 'granted',
      nextReminderState: 'scheduled',
      lastMigrationState: 'passed',
      databaseIntegrity: 'passed',
    );

    expect(report, contains('prediction-v1'));
    for (final forbidden in [
      'period',
      'symptom',
      'sexual',
      'pregnancy',
      'temperature',
      'medication',
    ]) {
      expect(report.toLowerCase(), isNot(contains('$forbidden=')));
    }
  });
}
