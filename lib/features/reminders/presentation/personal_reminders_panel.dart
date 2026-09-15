import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';

import '../data/personal_reminder_store.dart';
import '../data/reminder_scheduler.dart';
import '../domain/reminder_models.dart';

class PersonalRemindersPanel extends StatefulWidget {
  const PersonalRemindersPanel({required this.scheduler, super.key});
  final ReminderScheduler scheduler;

  @override
  State<PersonalRemindersPanel> createState() => _PersonalRemindersPanelState();
}

class _PersonalRemindersPanelState extends State<PersonalRemindersPanel> {
  static const _uuid = Uuid();
  final _store = PersonalReminderStore();
  late Future<List<PersonalReminder>> _future = _store.readAll();

  Future<void> _add() async {
    ReminderKind kind = ReminderKind.medication;
    TimeOfDay time = const TimeOfDay(hour: 8, minute: 0);
    final label = TextEditingController();
    final save = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(builder: (context, setState) => SafeArea(
        child: Padding(
          padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.viewInsetsOf(context).bottom + 20),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text('Daily private reminder', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 12),
            DropdownButtonFormField<ReminderKind>(
              value: kind,
              items: const [ReminderKind.medication, ReminderKind.contraception, ReminderKind.supplement, ReminderKind.ovulationTest, ReminderKind.pregnancyTest]
                  .map((value) => DropdownMenuItem(value: value, child: Text(_kindLabel(value))))
                  .toList(),
              onChanged: (value) { if (value != null) setState(() => kind = value); },
              decoration: const InputDecoration(labelText: 'Reminder type'),
            ),
            const SizedBox(height: 12),
            TextField(controller: label, decoration: const InputDecoration(labelText: 'Private label', hintText: 'e.g. evening tablet')),
            const SizedBox(height: 12),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Time'),
              subtitle: Text(time.format(context)),
              trailing: const Icon(Icons.schedule),
              onTap: () async {
                final value = await showTimePicker(context: context, initialTime: time);
                if (value != null) setState(() => time = value);
              },
            ),
            const SizedBox(height: 12),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Save daily reminder')),
          ]),
        ),
      )),
    );
    if (save != true) {
      label.dispose();
      return;
    }
    final values = await _store.readAll();
    final reminder = PersonalReminder(
      id: 'personal-${_uuid.v7()}',
      kind: kind,
      hour: time.hour,
      minute: time.minute,
      label: label.text.trim().isEmpty ? _kindLabel(kind) : label.text.trim(),
    );
    await _store.writeAll([...values, reminder]);
    await _schedule(reminder);
    label.dispose();
    if (mounted) setState(() => _future = _store.readAll());
  }

  Future<void> _schedule(PersonalReminder reminder) async {
    var permission = await widget.scheduler.permissionStatus();
    if (!permission.allowed && !await widget.scheduler.requestPermission()) return;
    permission = await widget.scheduler.permissionStatus();
    if (!permission.allowed) return;
    final plan = ReminderPlanner().personalDaily(
      id: reminder.id,
      kind: reminder.kind,
      hour: reminder.hour,
      minute: reminder.minute,
      label: reminder.label,
    );
    await widget.scheduler.cancel(reminder.id);
    await widget.scheduler.schedule(plan, ReminderPlanner().notificationBody(plan));
  }

  Future<void> _delete(PersonalReminder reminder) async {
    final values = await _store.readAll();
    await _store.writeAll(values.where((value) => value.id != reminder.id).toList());
    await widget.scheduler.cancel(reminder.id);
    if (mounted) setState(() => _future = _store.readAll());
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<List<PersonalReminder>>(
        future: _future,
        builder: (context, snapshot) {
          final values = snapshot.data ?? const [];
          return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Row(children: [
              Expanded(child: Text('Other reminders', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700))),
              IconButton(onPressed: _add, tooltip: 'Add reminder', icon: const Icon(Icons.add_alarm)),
            ]),
            const SizedBox(height: 4),
            const Text('Medication, contraception, supplement, ovulation-test and pregnancy-test reminders stay on this device.'),
            const SizedBox(height: 8),
            if (values.isEmpty)
              const Card(child: Padding(padding: EdgeInsets.all(16), child: Text('No daily reminders yet.')))
            else
              Card(child: Column(children: values.map((value) => ListTile(
                leading: const Icon(Icons.alarm),
                title: Text(value.label),
                subtitle: Text('${_kindLabel(value.kind)} · ${TimeOfDay(hour: value.hour, minute: value.minute).format(context)}'),
                trailing: IconButton(icon: const Icon(Icons.delete_outline), onPressed: () => _delete(value)),
              )).toList())),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: () async {
                for (final value in await _store.readAll()) {
                  if (value.enabled) await _schedule(value);
                }
                if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Daily reminders rebuilt on this device.')));
              },
              icon: const Icon(Icons.refresh),
              label: const Text('Rebuild daily reminders'),
            ),
          ]);
        },
      );

  static String _kindLabel(ReminderKind value) => switch (value) {
        ReminderKind.medication => 'Medication',
        ReminderKind.contraception => 'Contraception',
        ReminderKind.supplement => 'Supplement',
        ReminderKind.ovulationTest => 'Ovulation test',
        ReminderKind.pregnancyTest => 'Pregnancy test',
        _ => 'Cycle reminder',
      };
}
