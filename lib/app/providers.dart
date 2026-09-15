import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../core/crypto/vault_cipher.dart';
import '../core/database/health_vault.dart';
import '../core/database/local_health_repository.dart';
import '../features/assistant/data/voice_platform.dart';
import '../features/backup/data/cycle_vault_service.dart';
import '../features/cycle/domain/cycle_models.dart';
import '../features/health_integration/data/health_platform.dart';
import '../features/life_stage/data/life_stage_store.dart';
import '../features/life_stage/domain/life_stage.dart';
import '../features/predictions/data/prediction_history_store.dart';
import '../features/predictions/domain/cycle_prediction.dart';
import '../features/predictions/domain/cycle_predictor.dart';
import '../features/reminders/data/personal_reminder_store.dart';
import '../features/reminders/data/reminder_preferences.dart';
import '../features/reminders/data/reminder_scheduler.dart';
import '../features/reminders/domain/reminder_models.dart';
import '../features/reminders/domain/reminder_policy.dart';
import '../features/reports/data/doctor_report_service.dart';
import '../features/settings/data/app_preferences_store.dart';
import '../features/settings/domain/app_preferences.dart';

final healthVaultProvider = FutureProvider<HealthVault>((ref) async {
  final vault = await HealthVault.open();
  ref.onDispose(vault.close);
  return vault;
});

final healthRepositoryProvider = FutureProvider<HealthRepository>((ref) async {
  final vault = await ref.watch(healthVaultProvider.future);
  return LocalHealthRepository(vault: vault, cipher: VaultCipher());
});

final periodsProvider = FutureProvider<List<PeriodEpisode>>((ref) async {
  final repository = await ref.watch(healthRepositoryProvider.future);
  return repository.listPeriods();
});

final observationsProvider = FutureProvider<List<HealthObservation>>((ref) async {
  final repository = await ref.watch(healthRepositoryProvider.future);
  return repository.listObservations();
});

final predictionHistoryStoreProvider = FutureProvider<PredictionHistoryStore>((ref) async {
  final vault = await ref.watch(healthVaultProvider.future);
  return PredictionHistoryStore(vault: vault, cipher: VaultCipher());
});

final predictionProvider = FutureProvider<CyclePrediction?>((ref) async {
  final mode = await ref.watch(lifeStageProvider.future);
  if (!LifeStageCapabilities.forMode(mode).predictNextPeriod) return null;
  final periods = await ref.watch(periodsProvider.future);
  final prediction = CyclePredictor().predict(periods.map((e) => e.start).toList());
  if (prediction != null) {
    final history = await ref.watch(predictionHistoryStoreProvider.future);
    await history.recordIfNew(prediction);
  }
  return prediction;
});


final appPreferencesStoreProvider = Provider<AppPreferencesStore>((_) => AppPreferencesStore());
final appPreferencesProvider = FutureProvider<AppPreferences>((ref) => ref.watch(appPreferencesStoreProvider).read());

final personalReminderStoreProvider = Provider<PersonalReminderStore>((_) => PersonalReminderStore());
final reminderSchedulerProvider = Provider<ReminderScheduler>((_) => ReminderScheduler());
final reminderPreferencesStoreProvider = Provider<ReminderPreferencesStore>((_) => ReminderPreferencesStore());
final reminderPreferencesProvider = FutureProvider<ReminderPreferences>((ref) async {
  return ref.watch(reminderPreferencesStoreProvider).read();
});
final healthPlatformProvider = Provider<HealthPlatform>((_) => HealthPlatform());
final voicePlatformProvider = Provider<VoicePlatform>((_) => VoicePlatform());
final lifeStageStoreProvider = Provider<LifeStageStore>((_) => LifeStageStore());
final lifeStageProvider = FutureProvider<LifeStageMode>((ref) => ref.watch(lifeStageStoreProvider).read());
final cycleVaultServiceProvider = FutureProvider<CycleVaultService>((ref) async {
  return CycleVaultService(repository: await ref.watch(healthRepositoryProvider.future));
});
final doctorReportServiceProvider = FutureProvider<DoctorReportService>((ref) async {
  return DoctorReportService(repository: await ref.watch(healthRepositoryProvider.future));
});

final reminderReconciliationProvider = FutureProvider<void>((ref) async {
  final prediction = await ref.watch(predictionProvider.future);
  final preferences = await ref.watch(reminderPreferencesProvider.future);
  final scheduler = ref.watch(reminderSchedulerProvider);

  for (final kind in const [
    ReminderKind.periodSevenDays,
    ReminderKind.periodThreeDays,
    ReminderKind.periodOneDay,
    ReminderKind.periodExpectedDay,
    ReminderKind.periodLate,
  ]) {
    await scheduler.cancel('period-${kind.name}');
  }

  if (!preferences.enabled || prediction == null) return;
  final permission = await scheduler.permissionStatus();
  if (!permission.allowed) return;

  final sourcePredictionId = '${prediction.createdAt.millisecondsSinceEpoch}';
  final plans = ReminderPolicy().periodPlans(
    predictedDate: prediction.mostLikelyDate,
    sourcePredictionId: sourcePredictionId,
    settings: ReminderPolicySettings(
      enabledOffsetsDays: preferences.enabledOffsetsDays,
      lateDays: preferences.lateDays,
      hour: preferences.hour,
      minute: preferences.minute,
      privacy: preferences.privacy,
      quietStartHour: preferences.quietStartHour,
      quietEndHour: preferences.quietEndHour,
    ),
    now: DateTime.now(),
  );
  final bodyBuilder = ReminderPlanner();
  for (final plan in plans) {
    await scheduler.schedule(plan, bodyBuilder.notificationBody(plan));
  }
});


class HealthActions {
  HealthActions(this.ref);
  final Ref ref;
  static const Uuid _uuid = Uuid();

  Future<void> startPeriod(DateTime date) async {
    final repository = await ref.read(healthRepositoryProvider.future);
    await repository.savePeriod(
      PeriodEpisode(id: _uuid.v7(), start: DateTime(date.year, date.month, date.day)),
    );
    _refresh();
  }

  Future<void> endLatestPeriod(DateTime date) async {
    final repository = await ref.read(healthRepositoryProvider.future);
    final periods = await repository.listPeriods();
    if (periods.isEmpty) return;
    final latest = periods.last;
    await repository.savePeriod(
      PeriodEpisode(id: latest.id, start: latest.start, end: DateTime(date.year, date.month, date.day)),
    );
    _refresh();
  }

  Future<void> savePeriod(PeriodEpisode episode) async {
    final repository = await ref.read(healthRepositoryProvider.future);
    await repository.savePeriod(episode);
    _refresh();
  }

  Future<void> deletePeriod(String id) async {
    final repository = await ref.read(healthRepositoryProvider.future);
    await repository.deletePeriod(id);
    _refresh();
  }

  Future<void> addObservation({
    required ObservationKind kind,
    required DateTime occurredAt,
    ObservationSeverity? severity,
    double? numericValue,
    String? unit,
    String? label,
    String? note,
    FlowLevel? flowLevel,
    RecordSource source = RecordSource.app,
    String? externalId,
  }) async {
    final repository = await ref.read(healthRepositoryProvider.future);
    await repository.saveObservation(
      HealthObservation(
        id: _uuid.v7(),
        kind: kind,
        occurredAt: occurredAt,
        severity: severity,
        numericValue: numericValue,
        unit: unit,
        label: label,
        note: note,
        flowLevel: flowLevel,
        source: source,
        externalId: externalId,
      ),
    );
    _refresh();
  }

  void refreshAll() => _refresh();

  void _refresh() {
    ref.invalidate(periodsProvider);
    ref.invalidate(observationsProvider);
    ref.invalidate(predictionProvider);
  }
}

final healthActionsProvider = Provider<HealthActions>((ref) => HealthActions(ref));
