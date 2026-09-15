import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers.dart';
import '../../../core/settings/user_formatters.dart';
import '../../settings/domain/app_preferences.dart';
import '../data/reminder_preferences.dart';
import '../data/reminder_scheduler.dart';
import '../domain/reminder_models.dart';
import 'personal_reminders_panel.dart';

class RemindersScreen extends ConsumerStatefulWidget {
  const RemindersScreen({super.key});

  @override
  ConsumerState<RemindersScreen> createState() => _RemindersScreenState();
}

class _RemindersScreenState extends ConsumerState<RemindersScreen> {
  ReminderPreferences? _preferences;
  bool _busy = false;

  Future<ReminderPreferences> _load() async =>
      _preferences ??= await ref.read(reminderPreferencesStoreProvider).read();

  Future<void> _save(ReminderPreferences value) async {
    setState(() => _preferences = value);
    await ref.read(reminderPreferencesStoreProvider).write(value);
    ref.invalidate(reminderPreferencesProvider);
    ref.invalidate(reminderReconciliationProvider);
  }

  Future<void> _rebuild() async {
    setState(() => _busy = true);
    try {
      final scheduler = ref.read(reminderSchedulerProvider);
      var status = await scheduler.permissionStatus();
      if (!status.allowed) {
        final granted = await scheduler.requestPermission();
        if (!granted) throw StateError('Notifications are disabled.');
        status = await scheduler.permissionStatus();
      }
      ref.invalidate(reminderReconciliationProvider);
      await ref.read(reminderReconciliationProvider.future);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Local reminder plan rebuilt.')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final appPreferences = ref.watch(appPreferencesProvider).valueOrNull ??
        const AppPreferences();
    final clockPreference = appPreferences.clockPreference;
    return Scaffold(
      appBar: AppBar(title: const Text('Reminders')),
      body: FutureBuilder<ReminderPreferences>(
        future: _load(),
        builder: (context, snapshot) {
          final prefs = snapshot.data;
          if (prefs == null) {
            return const Center(child: CircularProgressIndicator());
          }
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              SwitchListTile(
                value: prefs.enabled,
                title: const Text('Period reminders'),
                subtitle: const Text(
                  'Choose one or more cycle-relative reminders.',
                ),
                onChanged: (value) => _save(prefs.copyWith(enabled: value)),
              ),
              const SizedBox(height: 8),
              const Text(
                'Period reminder days',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
              Wrap(
                spacing: 8,
                children: [
                  for (final entry in const [
                    (7, '7 days'),
                    (3, '3 days'),
                    (1, '1 day'),
                    (0, 'Expected day'),
                  ])
                    FilterChip(
                      selected: prefs.enabledOffsetsDays.contains(entry.$1),
                      label: Text(entry.$2),
                      onSelected: (selected) {
                        final next = {...prefs.enabledOffsetsDays};
                        if (selected) {
                          next.add(entry.$1);
                        } else {
                          next.remove(entry.$1);
                        }
                        _save(prefs.copyWith(enabledOffsetsDays: next));
                      },
                    ),
                ],
              ),
              SwitchListTile(
                value: prefs.lateDays > 0,
                title: const Text('Late-period reminder'),
                subtitle: Text(
                  prefs.lateDays > 0
                      ? '${prefs.lateDays} days after the predicted date'
                      : 'Off',
                ),
                onChanged: (value) =>
                    _save(prefs.copyWith(lateDays: value ? 2 : 0)),
              ),
              if (prefs.lateDays > 0)
                Slider(
                  value: prefs.lateDays.toDouble(),
                  min: 1,
                  max: 7,
                  divisions: 6,
                  label: '${prefs.lateDays} days',
                  onChanged: (value) =>
                      _save(prefs.copyWith(lateDays: value.round())),
                ),
              ListTile(
                title: const Text('Reminder time'),
                subtitle: Text(
                  UserFormatters.formatClock(
                    TimeOfDay(hour: prefs.hour, minute: prefs.minute),
                    clockPreference,
                    context,
                  ),
                ),
                trailing: const Icon(Icons.schedule),
                onTap: () async {
                  final value = await showTimePicker(
                    context: context,
                    initialTime: TimeOfDay(
                      hour: prefs.hour,
                      minute: prefs.minute,
                    ),
                  );
                  if (value != null) {
                    await _save(
                      prefs.copyWith(hour: value.hour, minute: value.minute),
                    );
                  }
                },
              ),
              ListTile(
                title: const Text('Quiet hours'),
                subtitle: Text(
                  '${UserFormatters.formatClock(TimeOfDay(hour: prefs.quietStartHour, minute: 0), clockPreference, context)} – '
                  '${UserFormatters.formatClock(TimeOfDay(hour: prefs.quietEndHour, minute: 0), clockPreference, context)}',
                ),
              ),
              ListTile(
                title: const Text('Lock-screen privacy'),
                trailing: DropdownButton<NotificationPrivacy>(
                  value: prefs.privacy,
                  items: NotificationPrivacy.values
                      .map(
                        (value) => DropdownMenuItem(
                          value: value,
                          child: Text(value.name),
                        ),
                      )
                      .toList(),
                  onChanged: (value) {
                    if (value != null) _save(prefs.copyWith(privacy: value));
                  },
                ),
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: _busy || !prefs.enabled ? null : _rebuild,
                icon: const Icon(Icons.alarm_add),
                label: Text(_busy ? 'Scheduling…' : 'Rebuild local reminders'),
              ),
              const SizedBox(height: 16),
              _ReminderHealthCard(
                scheduler: ref.read(reminderSchedulerProvider),
              ),
              const SizedBox(height: 24),
              PersonalRemindersPanel(
                scheduler: ref.read(reminderSchedulerProvider),
                clockPreference: clockPreference,
              ),
            ],
          );
        },
      ),
    );
  }
}

class _ReminderHealthCard extends StatelessWidget {
  const _ReminderHealthCard({required this.scheduler});

  final ReminderScheduler scheduler;

  Future<(ReminderPermissionStatus, List<Map<String, Object?>>)> _load() async {
    final status = await scheduler.permissionStatus();
    final pending = await scheduler.pending();
    return (status, pending);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<
      (ReminderPermissionStatus, List<Map<String, Object?>>)
    >(
      future: _load(),
      builder: (context, snapshot) {
        final status = snapshot.data?.$1;
        final pending = snapshot.data?.$2 ?? const <Map<String, Object?>>[];
        final next = pending.isEmpty
            ? 'No pending local reminders'
            : '${pending.length} local reminder(s) scheduled';
        return Card(
          child: ListTile(
            leading: Icon(
              status?.allowed == true
                  ? Icons.check_circle_outline
                  : Icons.warning_amber_outlined,
            ),
            title: const Text('Reminder Health'),
            subtitle: Text(
              'Notification permission: ${status?.description ?? 'checking'}\n$next',
            ),
            isThreeLine: true,
          ),
        );
      },
    );
  }
}
