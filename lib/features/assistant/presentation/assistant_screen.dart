import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:uuid/uuid.dart';

import '../../../app/providers.dart';
import '../../cycle/domain/cycle_models.dart';
import '../../reminders/domain/reminder_models.dart';
import '../../reminders/data/personal_reminder_store.dart';
import '../domain/local_intent_parser.dart';

class AssistantScreen extends ConsumerStatefulWidget {
  const AssistantScreen({super.key});

  @override
  ConsumerState<AssistantScreen> createState() => _AssistantScreenState();
}

class _AssistantScreenState extends ConsumerState<AssistantScreen> {
  final _controller = TextEditingController();
  ParsedCommand? _command;
  String? _answer;
  bool _listening = false;
  static const _uuid = Uuid();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _parse() async {
    final command = LocalIntentParser().parse(
      _controller.text,
      now: DateTime.now(),
    );
    String? answer;
    if (command.intent == LocalIntent.nextPeriodQuery) {
      final prediction = await ref.read(predictionProvider.future);
      answer = prediction == null
          ? 'I need at least two valid period starts before I can estimate the next period.'
          : 'Most likely ${DateFormat.yMMMd().format(prediction.mostLikelyDate)}, with an expected window of ${DateFormat.MMMd().format(prediction.windowStart)}–${DateFormat.MMMd().format(prediction.windowEnd)} (${prediction.confidence.name} confidence).';
    } else if (command.intent == LocalIntent.historyQuery) {
      final periods = await ref.read(periodsProvider.future);
      final recent = periods.reversed.take(6).toList();
      answer = recent.isEmpty
          ? 'No period history is stored yet.'
          : recent
                .map((period) => DateFormat.yMMMd().format(period.start))
                .join(' · ');
    }
    if (!mounted) return;
    setState(() {
      _command = command;
      _answer = answer;
    });
  }

  Future<void> _voice() async {
    final voice = ref.read(voicePlatformProvider);
    if (!await voice.supportsOfflineRecognition()) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Offline voice recognition is unavailable on this device/language. Nothing was uploaded.',
            ),
          ),
        );
      }
      return;
    }
    setState(() => _listening = true);
    final text = await voice.transcribeOnce();
    if (!mounted) return;
    setState(() {
      _listening = false;
      if (text != null) _controller.text = text;
    });
    if (text != null) await _parse();
  }

  Future<void> _confirm() async {
    final command = _command;
    if (command == null) return;
    if (command.intent == LocalIntent.periodStarted) {
      await ref
          .read(healthActionsProvider)
          .startPeriod(command.date ?? DateTime.now());
    } else if (command.intent == LocalIntent.periodEnded) {
      await ref
          .read(healthActionsProvider)
          .endLatestPeriod(command.date ?? DateTime.now());
    } else if (command.intent == LocalIntent.logSymptom ||
        command.intent == LocalIntent.logFlow) {
      await ref
          .read(healthActionsProvider)
          .addObservation(
            kind: command.observationKind ?? ObservationKind.custom,
            occurredAt: command.date ?? DateTime.now(),
            severity: command.severity,
            label: command.label,
            note: command.note,
            flowLevel: command.flowLevel,
          );
    } else if (command.intent == LocalIntent.addReminder) {
      if (command.reminderHour == null || command.reminderMinute == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Please include a time, for example “Remind me about my medicine at 8 PM”.',
              ),
            ),
          );
        }
        return;
      }
      final id = _uuid.v7();
      final reminder = PersonalReminder(
        id: id,
        kind: command.reminderKind ?? ReminderKind.medication,
        hour: command.reminderHour!,
        minute: command.reminderMinute!,
        label: command.label ?? 'Health reminder',
      );
      final store = ref.read(personalReminderStoreProvider);
      final all = await store.readAll();
      await store.writeAll([...all, reminder]);
      final plan = ReminderPlanner().personalDaily(
        id: id,
        kind: reminder.kind,
        hour: reminder.hour,
        minute: reminder.minute,
        label: reminder.label,
      );
      await ref
          .read(reminderSchedulerProvider)
          .schedule(plan, ReminderPlanner().notificationBody(plan));
    } else if (command.intent == LocalIntent.unknown) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'I could not safely turn that into a local health action. Nothing was saved.',
            ),
          ),
        );
      }
      return;
    }
    if (mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Saved locally.')));
      setState(() {
        _controller.clear();
        _command = null;
        _answer = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Private assistant')),
      body: ListView(
        padding: const EdgeInsetsDirectional.fromSTEB(16, 16, 16, 24),
        children: [
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Try: “My period started yesterday”, “I have bad cramps”, “Yesterday was heavy”, “When is my next period?”, or “Remind me about my medicine at 8 PM”. Parsing happens locally.',
              ),
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _controller,
            minLines: 2,
            maxLines: 5,
            decoration: InputDecoration(
              labelText: 'Tell Sreadya',
              suffixIcon: IconButton(
                tooltip: 'Use offline voice input',
                onPressed: _listening ? null : _voice,
                icon: Icon(_listening ? Icons.hearing : Icons.mic_none),
              ),
            ),
            onSubmitted: (_) => _parse(),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _controller.text.trim().isEmpty ? null : _parse,
            child: const Text('Understand locally'),
          ),
          if (_command != null) ...[
            const SizedBox(height: 20),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Sreadya understood',
                      style: Theme.of(context).textTheme.titleMedium
                          ?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 8),
                    Text('Intent: ${_command!.intent.name}'),
                    if (_command!.date != null)
                      Text(
                        'Date: ${DateFormat.yMMMd().format(_command!.date!)}',
                      ),
                    if (_command!.label != null)
                      Text('Detail: ${_command!.label}'),
                    if (_command!.reminderHour != null)
                      Text(
                        'Reminder time: ${_command!.reminderHour!.toString().padLeft(2, '0')}:${(_command!.reminderMinute ?? 0).toString().padLeft(2, '0')}',
                      ),
                    if (_answer != null) ...[
                      const SizedBox(height: 12),
                      SelectableText(_answer!),
                    ],
                    const SizedBox(height: 12),
                    if (_command!.requiresConfirmation)
                      FilledButton.icon(
                        onPressed: _confirm,
                        icon: const Icon(Icons.check),
                        label: const Text('Confirm'),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
