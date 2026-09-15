import 'package:flutter_test/flutter_test.dart';
import 'package:sreva/core/diagnostics/diagnostic_report_builder.dart';

void main() {
  test('diagnostic report contains exactly allowlisted operational metadata', () {
    final builder = DiagnosticReportBuilder();
    final report = builder.build(
      appVersion: '1.0.0',
      platform: 'Android',
      osVersion: '16',
      databaseSchema: 1,
      predictionEngine: 'prediction-v1',
      reminderEngine: 'reminder-v1',
      healthAdapter: 'health-v1',
      notificationPermission: 'granted',
      nextReminderState: 'scheduled',
      lastMigrationState: 'passed',
      databaseIntegrity: 'passed',
    );

    final lines = report.split('\n');
    expect(lines, hasLength(11));
    expect(lines.map((line) => line.split('=').first).toSet(), {
      'app_version',
      'platform',
      'os_version',
      'database_schema',
      'prediction_engine',
      'reminder_engine',
      'health_adapter',
      'notification_permission',
      'next_reminder_state',
      'last_migration_state',
      'database_integrity',
    });
  });

  test('diagnostic report cannot contain health payload fields', () {
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
      'period=',
      'period_date=',
      'symptom=',
      'note=',
      'sexual=',
      'fertility=',
      'pregnancy=',
      'temperature=',
      'medication=',
    ]) {
      expect(report.toLowerCase(), isNot(contains(forbidden)));
    }
  });
}
