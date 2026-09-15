class DiagnosticReportBuilder {
  String build({
    required String appVersion,
    required String platform,
    required String osVersion,
    required int databaseSchema,
    required String predictionEngine,
    required String reminderEngine,
    required String healthAdapter,
    required String notificationPermission,
    required String nextReminderState,
    required String lastMigrationState,
    required String databaseIntegrity,
  }) {
    final values = <String, Object>{
      'app_version': appVersion,
      'platform': platform,
      'os_version': osVersion,
      'database_schema': databaseSchema,
      'prediction_engine': predictionEngine,
      'reminder_engine': reminderEngine,
      'health_adapter': healthAdapter,
      'notification_permission': notificationPermission,
      'next_reminder_state': nextReminderState,
      'last_migration_state': lastMigrationState,
      'database_integrity': databaseIntegrity,
    };
    return values.entries.map((e) => '${e.key}=${e.value}').join('\n');
  }
}
