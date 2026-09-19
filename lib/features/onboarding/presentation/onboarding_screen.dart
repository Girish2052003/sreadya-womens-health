import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../brand/sreadya_brand.dart';

import '../../../app/providers.dart';
import '../../../core/settings/local_settings_store.dart';
import '../../../core/settings/user_formatters.dart';
import '../../cycle/domain/cycle_models.dart';
import '../../health_integration/data/health_import_service.dart';
import '../../health_integration/data/health_platform.dart';
import '../../life_stage/domain/life_stage.dart';
import '../../reminders/domain/reminder_models.dart';
import '../../settings/data/privacy_settings_store.dart';

class OnboardingStore {
  OnboardingStore({LocalSettingsStore? settings})
    : _settings = settings ?? LocalSettingsStore();
  static const _key = 'sreadya.onboarding.complete.v1';
  final LocalSettingsStore _settings;
  Future<bool> isComplete() => _settings.readBool(_key);
  Future<void> complete() => _settings.writeBool(_key, true);
}

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({required this.onComplete, super.key});
  final VoidCallback onComplete;

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final List<DateTime> _starts = [];
  LifeStageMode _lifeStage = LifeStageMode.cycleTracking;
  NotificationPrivacy _notificationPrivacy = NotificationPrivacy.maximum;
  bool _enableReminders = false;
  bool _importHealth = false;
  List<Map<String, Object?>>? _healthPreview;
  bool _saving = false;

  Future<void> _addDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: now.subtract(const Duration(days: 28)),
      firstDate: DateTime(now.year - 5),
      lastDate: now,
    );
    if (picked != null && !_starts.any((d) => DateUtils.isSameDay(d, picked))) {
      setState(() {
        _starts.add(picked);
        _starts.sort();
      });
    }
  }

  Future<void> _previewHealth() async {
    final platform = ref.read(healthPlatformProvider);
    final status = await platform.status();
    if (!status.available) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'A supported platform health store is not available on this device.',
            ),
          ),
        );
      }
      return;
    }
    const categories = {HealthDataCategory.menstrualFlow};
    final authorized = await platform.requestAuthorization(
      categories,
      includeHistory: true,
    );
    if (!authorized) return;
    final refreshedStatus = await platform.status();
    final now = DateTime.now();
    final from = refreshedStatus.historicalReadGranted
        ? DateTime(now.year - 2, now.month, now.day)
        : now.subtract(const Duration(days: 30));
    final rows = await platform.readRecords(
      categories: categories,
      from: from,
      to: now,
    );
    if (mounted) setState(() => _healthPreview = rows);
  }

  Future<void> _finish() async {
    setState(() => _saving = true);
    try {
      await ref.read(lifeStageStoreProvider).write(_lifeStage);
      ref.invalidate(lifeStageProvider);

      var notificationAllowed = false;
      if (_enableReminders) {
        notificationAllowed = await ref
            .read(reminderSchedulerProvider)
            .requestPermission();
      }

      final reminderStore = ref.read(reminderPreferencesStoreProvider);
      final reminder = await reminderStore.read();
      await reminderStore.write(
        reminder.copyWith(
          enabled: _enableReminders && notificationAllowed,
          enabledOffsetsDays: const {3},
          privacy: _notificationPrivacy,
        ),
      );
      ref.invalidate(reminderPreferencesProvider);

      final privacyStore = PrivacySettingsStore();
      final privacy = await privacyStore.read();
      await privacyStore.write(
        privacy.copyWith(notificationPrivacy: _notificationPrivacy),
      );

      for (final date in _starts) {
        await ref.read(healthActionsProvider).startPeriod(date);
      }

      if (_importHealth && _healthPreview != null) {
        final rows = _healthPreview!;
        if (rows.isNotEmpty) {
          final status = await ref.read(healthPlatformProvider).status();
          final source = status.platformName.toLowerCase().contains('apple')
              ? RecordSource.healthKit
              : RecordSource.healthConnect;
          final repository = await ref.read(healthRepositoryProvider.future);
          await HealthImportService(repository: repository)
              .importRecords(rows, source: source);
          ref.read(healthActionsProvider).refreshAll();
        }
      }

      if (_enableReminders && !notificationAllowed && mounted) {
        await showDialog<void>(
          context: context,
          builder: (dialogContext) => AlertDialog(
            icon: const Icon(Icons.notifications_off_outlined),
            title: const Text('Reminders stay off for now'),
            content: const Text(
              'Android notification access was not granted. Sreadya will continue normally without reminders. You can enable them later from More > Reminders.',
            ),
            actions: [
              FilledButton(
                onPressed: () => Navigator.of(dialogContext).pop(),
                child: const Text('Continue'),
              ),
            ],
          ),
        );
      }

      await OnboardingStore().complete();
      widget.onComplete();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Setup could not finish: $error')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = Localizations.localeOf(context);
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const SizedBox(height: 12),
            Center(
              child: Column(
                children: [
                  const SreadyaBrandIcon(
                    size: 92,
                    semanticLabel: 'Sreadya app icon',
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Welcome to Sreadya',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineMedium
                        ?.copyWith(fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Your cycle. Your rhythm. Your space.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Card(
              color: Theme.of(context).colorScheme.primaryContainer,
              child: const Padding(
                padding: EdgeInsets.all(18),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.shield_outlined),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Sreadya stores and processes reproductive-health information on this device. No account is required. Predictions are estimates, not medical diagnoses or contraceptive guarantees.',
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
            DropdownButtonFormField<LifeStageMode>(
              initialValue: _lifeStage,
              decoration: const InputDecoration(labelText: 'Life-stage mode'),
              items: LifeStageMode.values
                  .map(
                    (value) => DropdownMenuItem(
                      value: value,
                      child: Text(value.label),
                    ),
                  )
                  .toList(),
              onChanged: (value) {
                if (value != null) setState(() => _lifeStage = value);
              },
            ),
            const SizedBox(height: 20),
            Text(
              'Add recent period starts',
              style: Theme.of(context).textTheme.titleLarge
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 6),
            const Text(
              'Two dates unlock a first prediction; six or more improve confidence. You can skip this and add history later.',
            ),
            const SizedBox(height: 12),
            if (_starts.isNotEmpty)
              Card(
                child: Column(
                  children: _starts
                      .map(
                        (date) => ListTile(
                          leading: const Icon(Icons.water_drop_outlined),
                          title: Text(UserFormatters.formatDate(date, locale)),
                          trailing: IconButton(
                            icon: const Icon(Icons.close),
                            onPressed: () =>
                                setState(() => _starts.remove(date)),
                          ),
                        ),
                      )
                      .toList(),
                ),
              ),
            OutlinedButton.icon(
              onPressed: _addDate,
              icon: const Icon(Icons.add),
              label: const Text('Add a previous period start'),
            ),
            const SizedBox(height: 24),
            Text(
              'Reminders & permissions',
              style: Theme.of(context).textTheme.titleLarge
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Card(
              child: SwitchListTile(
                value: _enableReminders,
                secondary: const Icon(Icons.notifications_active_outlined),
                title: const Text('Enable private cycle reminders'),
                subtitle: const Text(
                  'Optional. If you turn this on, Android will ask for notification access only after you tap Start using Sreadya.',
                ),
                onChanged: (value) => setState(() => _enableReminders = value),
              ),
            ),
            if (_enableReminders) ...[
              const SizedBox(height: 12),
              DropdownButtonFormField<NotificationPrivacy>(
                initialValue: _notificationPrivacy,
                decoration: const InputDecoration(
                  labelText: 'Lock-screen reminder privacy',
                ),
                items: const [
                  DropdownMenuItem(
                    value: NotificationPrivacy.maximum,
                    child: Text('Maximum — “You have a reminder.”'),
                  ),
                  DropdownMenuItem(
                    value: NotificationPrivacy.balanced,
                    child: Text('Balanced — cycle reminder'),
                  ),
                  DropdownMenuItem(
                    value: NotificationPrivacy.detailed,
                    child: Text('Detailed — timing may appear'),
                  ),
                ],
                onChanged: (value) {
                  if (value != null) {
                    setState(() => _notificationPrivacy = value);
                  }
                },
              ),
              const SizedBox(height: 8),
              const Text(
                'The initial plan is a private 3-day-before reminder. You can change days, time and quiet hours later.',
              ),
            ],
            const SizedBox(height: 20),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              value: _importHealth,
              title: const Text('Connect Health Connect'),
              subtitle: const Text(
                'Optional. Turning this switch on does not request access. Use the preview button below to choose menstrual-flow access in Android.',
              ),
              onChanged: (value) => setState(() {
                _importHealth = value;
                if (!value) _healthPreview = null;
              }),
            ),
            if (_importHealth) ...[
              OutlinedButton.icon(
                onPressed: _saving ? null : _previewHealth,
                icon: const Icon(Icons.preview_outlined),
                label: const Text('Choose access & preview Health Connect'),
              ),
              if (_healthPreview == null)
                const Padding(
                  padding: EdgeInsets.only(top: 8),
                  child: Text(
                    'No health permission is requested until you tap the button above. You can also finish setup without connecting Health Connect.',
                  ),
                ),
              if (_healthPreview != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    '${_healthPreview!.length} platform record(s) found. Nothing has been imported yet.',
                  ),
                ),
            ],
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _saving ? null : _finish,
              child: Text(
                _saving
                    ? 'Preparing your private vault…'
                    : 'Start using Sreadya',
              ),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: _saving ? null : _finish,
              child: const Text('Continue without history'),
            ),
          ],
        ),
      ),
    );
  }
}
