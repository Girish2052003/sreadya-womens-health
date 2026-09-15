import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers.dart';
import '../../../core/platform/privacy_platform.dart';
import '../../health_integration/data/health_platform.dart';
import '../../privacy/data/app_lock_service.dart';
import '../../reminders/domain/reminder_models.dart';
import '../../settings/data/privacy_settings_store.dart';
import '../../settings/domain/privacy_settings.dart';

class PrivacyCenterScreen extends ConsumerStatefulWidget {
  const PrivacyCenterScreen({super.key});

  @override
  ConsumerState<PrivacyCenterScreen> createState() =>
      _PrivacyCenterScreenState();
}

class _PrivacyCenterScreenState extends ConsumerState<PrivacyCenterScreen> {
  late Future<PrivacySettings> _settings = PrivacySettingsStore().read();
  late Future<HealthPlatformStatus> _healthStatus = ref
      .read(healthPlatformProvider)
      .status();

  Future<void> _save(PrivacySettings next) async {
    await PrivacySettingsStore().write(next);
    if (!mounted) return;
    setState(() => _settings = Future.value(next));
  }

  Future<void> _setAppLock(PrivacySettings current, bool enabled) async {
    if (enabled) {
      final service = AppLockService();
      if (!await service.isAvailable() || !await service.unlock()) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Configure and successfully unlock with Face ID, Touch ID, or the device passcode before enabling Sreva App Lock.',
              ),
            ),
          );
        }
        return;
      }
    }
    await _save(current.copyWith(appLockEnabled: enabled));
  }

  Future<void> _setNotificationPrivacy(
    PrivacySettings current,
    NotificationPrivacy value,
  ) async {
    await _save(current.copyWith(notificationPrivacy: value));
    final store = ref.read(reminderPreferencesStoreProvider);
    final reminders = await store.read();
    await store.write(reminders.copyWith(privacy: value));
    ref.invalidate(reminderPreferencesProvider);
  }

  Future<void> _wipeAll() async {
    final first = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete all Sreva health data?'),
        content: const Text(
          'This permanently removes all periods and health observations from this device. Create a CycleVault backup first if you may need the history later.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Continue'),
          ),
        ],
      ),
    );
    if (first != true || !mounted) return;
    final second = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Final confirmation'),
        content: const Text(
          'There is no developer cloud copy to recover from. Delete the local health history now?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Keep my data'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete permanently'),
          ),
        ],
      ),
    );
    if (second != true) return;
    final repository = await ref.read(healthRepositoryProvider.future);
    await repository.replaceAll(periods: const [], observations: const []);
    ref.read(healthActionsProvider).refreshAll();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Local Sreva health data deleted.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Privacy Center')),
      body: FutureBuilder<PrivacySettings>(
        future: _settings,
        builder: (context, snapshot) {
          final settings = snapshot.data ?? const PrivacySettings();
          return ListView(
            padding: const EdgeInsetsDirectional.fromSTEB(16, 16, 16, 32),
            children: [
              const _PrivacyStatus(
                icon: Icons.phone_iphone,
                title: 'Health data location',
                value: 'This device',
              ),
              const _PrivacyStatus(
                icon: Icons.cloud_off_outlined,
                title: 'Developer health database',
                value: 'None',
              ),
              const _PrivacyStatus(
                icon: Icons.query_stats_outlined,
                title: 'Behavior analytics',
                value: 'Disabled',
              ),
              const _PrivacyStatus(
                icon: Icons.lock_outline,
                title: 'Database protection',
                value: 'SQLCipher + AES-GCM',
              ),
              FutureBuilder<HealthPlatformStatus>(
                future: _healthStatus,
                builder: (_, status) => _PrivacyStatus(
                  icon: Icons.health_and_safety_outlined,
                  title: 'Platform health access',
                  value: status.data?.available == true
                      ? (status.data!.authorizationRequested
                            ? 'User-controlled permission choice requested'
                            : 'Not requested')
                      : 'Not connected',
                ),
              ),
              const _PrivacyStatus(
                icon: Icons.people_outline,
                title: 'Partner live access',
                value: 'None — V1 shares only after explicit preview',
              ),
              const SizedBox(height: 16),
              SwitchListTile(
                value: settings.appLockEnabled,
                title: const Text('App lock'),
                subtitle: const Text(
                  'Require Face ID, Touch ID, or the device passcode when Sreva locks.',
                ),
                onChanged: (value) => _setAppLock(settings, value),
              ),
              if (settings.appLockEnabled)
                DropdownButtonFormField<int>(
                  value: settings.autoLockMinutes,
                  decoration: const InputDecoration(
                    labelText: 'Automatically lock after',
                  ),
                  items: const [
                    DropdownMenuItem(value: 0, child: Text('Immediately')),
                    DropdownMenuItem(value: 1, child: Text('1 minute')),
                    DropdownMenuItem(value: 5, child: Text('5 minutes')),
                    DropdownMenuItem(value: 15, child: Text('15 minutes')),
                  ],
                  onChanged: (value) {
                    if (value != null)
                      _save(settings.copyWith(autoLockMinutes: value));
                  },
                ),
              const SizedBox(height: 16),
              DropdownButtonFormField<NotificationPrivacy>(
                value: settings.notificationPrivacy,
                decoration: const InputDecoration(
                  labelText: 'Notification privacy',
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
                    child: Text('Detailed — period timing may appear'),
                  ),
                ],
                onChanged: (value) {
                  if (value != null) _setNotificationPrivacy(settings, value);
                },
              ),
              const SizedBox(height: 12),
              FilledButton.tonalIcon(
                onPressed: () async {
                  final available = await AppLockService().isAvailable();
                  if (!context.mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        available
                            ? 'Device authentication is available.'
                            : 'Device authentication is not configured.',
                      ),
                    ),
                  );
                },
                icon: const Icon(Icons.face),
                label: const Text('Check Face ID / device lock'),
              ),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: () async {
                  await PrivacyPlatform().setSensitiveScreen(true);
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text(
                          'Sensitive app-switcher protection requested.',
                        ),
                      ),
                    );
                  }
                },
                icon: const Icon(Icons.visibility_off_outlined),
                label: const Text('Protect app-switcher preview now'),
              ),
              const SizedBox(height: 24),
              Text(
                'Why data is stored',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              const Card(
                child: Column(
                  children: [
                    ListTile(
                      title: Text('Menstrual flow'),
                      subtitle: Text(
                        'Stored on this device for cycle history and predictions. Shared with us: No. Delete: Anytime.',
                      ),
                    ),
                    Divider(height: 1),
                    ListTile(
                      title: Text('Symptoms and mood'),
                      subtitle: Text(
                        'Stored on this device for your diary and observational insights. Shared with us: No. Delete: Anytime.',
                      ),
                    ),
                    Divider(height: 1),
                    ListTile(
                      title: Text('Sexual / fertility observations'),
                      subtitle: Text(
                        'Optional and local. Partner V1 never includes these categories. Doctor reports exclude private categories by default.',
                      ),
                    ),
                    Divider(height: 1),
                    ListTile(
                      title: Text('Predictions'),
                      subtitle: Text(
                        'Computed on this device from local cycle history and stored locally for calibration.',
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'Delete data',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: _wipeAll,
                icon: const Icon(Icons.delete_forever_outlined),
                label: const Text('Delete all local Sreva health data'),
              ),
              const SizedBox(height: 16),
              const Text(
                'Face ID and device authentication are controlled by the operating system. Sreva receives only the success/failure result, never biometric templates or the device passcode.',
              ),
            ],
          );
        },
      ),
    );
  }
}

class _PrivacyStatus extends StatelessWidget {
  const _PrivacyStatus({
    required this.icon,
    required this.title,
    required this.value,
  });
  final IconData icon;
  final String title;
  final String value;

  @override
  Widget build(BuildContext context) => Card(
    child: ListTile(
      leading: Icon(icon),
      title: Text(title),
      subtitle: Text(value),
    ),
  );
}
