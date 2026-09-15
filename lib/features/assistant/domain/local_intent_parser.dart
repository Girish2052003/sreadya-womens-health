import '../../cycle/domain/cycle_models.dart';
import '../../reminders/domain/reminder_models.dart';

enum LocalIntent {
  periodStarted,
  periodEnded,
  logFlow,
  logSymptom,
  addReminder,
  nextPeriodQuery,
  historyQuery,
  unknown,
}

class ParsedCommand {
  const ParsedCommand({
    required this.intent,
    required this.requiresConfirmation,
    this.date,
    this.value,
    this.rawText,
    this.reminderHour,
    this.reminderMinute,
    this.reminderKind,
  });

  final LocalIntent intent;
  final bool requiresConfirmation;
  final DateTime? date;
  final String? value;
  final String? rawText;
  final int? reminderHour;
  final int? reminderMinute;
  final ReminderKind? reminderKind;

  ObservationKind? get observationKind {
    if (intent == LocalIntent.logFlow) return ObservationKind.menstrualFlow;
    if (intent != LocalIntent.logSymptom) return null;
    final text = (value ?? '').toLowerCase();
    const mapping = <String, ObservationKind>{
      'cramp': ObservationKind.cramps,
      'migraine': ObservationKind.migraine,
      'headache': ObservationKind.headache,
      'back pain': ObservationKind.backPain,
      'breast': ObservationKind.breastTenderness,
      'bloat': ObservationKind.bloating,
      'acne': ObservationKind.acne,
      'nausea': ObservationKind.nausea,
      'digest': ObservationKind.digestion,
      'fatigue': ObservationKind.fatigue,
      'dizz': ObservationKind.dizziness,
      'appetite': ObservationKind.appetite,
      'craving': ObservationKind.cravings,
      'sleep': ObservationKind.sleep,
      'energy': ObservationKind.energy,
      'stress': ObservationKind.stress,
      'mood': ObservationKind.mood,
      'anxiety': ObservationKind.anxiety,
      'irrit': ObservationKind.irritability,
      'libido': ObservationKind.libido,
    };
    for (final entry in mapping.entries) {
      if (text.contains(entry.key)) return entry.value;
    }
    return ObservationKind.custom;
  }

  FlowLevel? get flowLevel => switch ((value ?? '').toLowerCase()) {
    'spotting' => FlowLevel.spotting,
    'light' => FlowLevel.light,
    'medium' => FlowLevel.medium,
    'heavy' => FlowLevel.heavy,
    _ => null,
  };

  ObservationSeverity? get severity {
    final text = (value ?? rawText ?? '').toLowerCase();
    if (text.contains('severe') ||
        text.contains('very bad') ||
        text.contains('bad cramps')) {
      return ObservationSeverity.severe;
    }
    if (text.contains('moderate')) return ObservationSeverity.moderate;
    if (intent == LocalIntent.logSymptom) return ObservationSeverity.mild;
    return null;
  }

  String? get label {
    if (intent == LocalIntent.logFlow) return '${value ?? 'Flow'} flow';
    if (intent == LocalIntent.addReminder)
      return _reminderLabel(value ?? rawText ?? 'Health reminder');
    final kind = observationKind;
    return kind?.name;
  }

  String? get note => rawText;

  String _reminderLabel(String input) {
    var text = input.trim();
    text = text.replaceFirst(
      RegExp(r'^remind me(?: to| about)?\s*', caseSensitive: false),
      '',
    );
    text = text.replaceAll(
      RegExp(
        r'\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*$',
        caseSensitive: false,
      ),
      '',
    );
    return text.trim().isEmpty ? 'Health reminder' : text.trim();
  }
}

class LocalIntentParser {
  ParsedCommand parse(String input, {required DateTime now}) {
    final text = input.trim().toLowerCase().replaceAll(RegExp(r'\s+'), ' ');
    final today = DateTime(now.year, now.month, now.day);
    final date = text.contains('yesterday')
        ? today.subtract(const Duration(days: 1))
        : today;

    if (text.contains('period') &&
        _containsAny(text, ['started', 'start', 'began', 'begin'])) {
      return ParsedCommand(
        intent: LocalIntent.periodStarted,
        date: date,
        requiresConfirmation: true,
        rawText: input,
      );
    }
    if (text.contains('period') &&
        _containsAny(text, ['ended', 'end', 'stopped', 'stop'])) {
      return ParsedCommand(
        intent: LocalIntent.periodEnded,
        date: date,
        requiresConfirmation: true,
        rawText: input,
      );
    }
    for (final flow in ['spotting', 'light', 'medium', 'heavy']) {
      if (text.contains(flow) &&
          _containsAny(text, ['flow', 'bleeding', 'yesterday', 'today'])) {
        return ParsedCommand(
          intent: LocalIntent.logFlow,
          date: date,
          value: flow,
          requiresConfirmation: true,
          rawText: input,
        );
      }
    }
    if (_containsAny(text, [
      'cramp',
      'headache',
      'migraine',
      'back pain',
      'breast',
      'bloating',
      'acne',
      'nausea',
      'fatigue',
      'dizzy',
      'dizziness',
      'appetite',
      'craving',
      'sleep',
      'energy',
      'stress',
      'mood',
      'anxiety',
      'irritable',
      'irritability',
      'libido',
    ])) {
      return ParsedCommand(
        intent: LocalIntent.logSymptom,
        date: date,
        value: text,
        requiresConfirmation: true,
        rawText: input,
      );
    }
    if (text.contains('remind me')) {
      final time = _parseTime(text);
      return ParsedCommand(
        intent: LocalIntent.addReminder,
        date: date,
        value: input,
        reminderHour: time?.$1,
        reminderMinute: time?.$2,
        reminderKind: _reminderKind(text),
        requiresConfirmation: true,
        rawText: input,
      );
    }
    if (_containsAny(text, [
      'next period',
      'when is my period',
      'when should my period',
    ])) {
      return ParsedCommand(
        intent: LocalIntent.nextPeriodQuery,
        requiresConfirmation: false,
        rawText: input,
      );
    }
    if (_containsAny(text, [
      'last six periods',
      'period history',
      'show my periods',
    ])) {
      return ParsedCommand(
        intent: LocalIntent.historyQuery,
        requiresConfirmation: false,
        rawText: input,
      );
    }
    return ParsedCommand(
      intent: LocalIntent.unknown,
      date: date,
      requiresConfirmation: true,
      rawText: input,
    );
  }

  (int, int)? _parseTime(String text) {
    final match = RegExp(
      r'\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b',
      caseSensitive: false,
    ).firstMatch(text);
    if (match == null) return null;
    var hour = int.tryParse(match.group(1) ?? '');
    final minute = int.tryParse(match.group(2) ?? '0') ?? 0;
    if (hour == null || hour > 23 || minute > 59) return null;
    final meridiem = match.group(3)?.toLowerCase();
    if (meridiem != null) {
      if (hour < 1 || hour > 12) return null;
      if (meridiem == 'pm' && hour != 12) hour += 12;
      if (meridiem == 'am' && hour == 12) hour = 0;
    }
    return (hour, minute);
  }

  ReminderKind _reminderKind(String text) {
    if (_containsAny(text, ['contraception', 'birth control', 'pill']))
      return ReminderKind.contraception;
    if (text.contains('supplement')) return ReminderKind.supplement;
    if (text.contains('ovulation')) return ReminderKind.ovulationTest;
    if (text.contains('pregnancy test')) return ReminderKind.pregnancyTest;
    return ReminderKind.medication;
  }

  bool _containsAny(String text, List<String> values) =>
      values.any(text.contains);
}
