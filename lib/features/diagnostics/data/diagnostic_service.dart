import 'dart:io';

import '../../../core/database/health_vault.dart';
import '../../../core/diagnostics/diagnostic_report_builder.dart';
import '../../../core/version/app_versions.dart';
import '../../reminders/data/reminder_scheduler.dart';

class DiagnosticService {
  DiagnosticService({
    required this._vault,
    ReminderScheduler? reminderScheduler,
  }) : _reminders = reminderScheduler ?? ReminderScheduler();

  final HealthVault _vault;
  final ReminderScheduler _reminders;

  Future<String> build() async {
    final permission = await _reminders.permissionStatus();
    final pending = await _reminders.pending();
    return '${DiagnosticReportBuilder().build(appVersion: AppVersions.app, platform: Platform.operatingSystem, osVersion: Platform.operatingSystemVersion, databaseSchema: _vault.schemaVersion, predictionEngine: AppVersions.predictionEngine, reminderEngine: AppVersions.reminderEngine, healthAdapter: AppVersions.healthAdapter, notificationPermission: permission.description, nextReminderState: pending.isEmpty ? 'none' : 'scheduled:${pending.length}', lastMigrationState: 'schema-${_vault.schemaVersion}', databaseIntegrity: _vault.integrityCheck())}\ndatabase_cipher=${_vault.cipherVersion()}';
  }
}
