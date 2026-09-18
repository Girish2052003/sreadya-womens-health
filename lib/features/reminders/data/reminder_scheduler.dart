import 'package:flutter/services.dart';

import '../domain/reminder_models.dart';

class ReminderPermissionStatus {
  const ReminderPermissionStatus({
    required this.allowed,
    required this.description,
  });
  final bool allowed;
  final String description;
}

class ReminderScheduler {
  static const MethodChannel _channel = MethodChannel('sreadya/reminders');

  Future<ReminderPermissionStatus> permissionStatus() async {
    try {
      final value = await _channel.invokeMapMethod<String, Object?>(
        'permissionStatus',
      );
      return ReminderPermissionStatus(
        allowed: value?['allowed'] == true,
        description: value?['description']?.toString() ?? 'unknown',
      );
    } on MissingPluginException {
      return const ReminderPermissionStatus(
        allowed: false,
        description: 'platform adapter unavailable',
      );
    }
  }

  Future<bool> requestPermission() async {
    try {
      return await _channel.invokeMethod<bool>('requestPermission') ?? false;
    } on MissingPluginException {
      return false;
    }
  }

  Future<void> schedule(ReminderPlan plan, String body) async {
    try {
      await _channel.invokeMethod<void>('schedule', {
        'id': plan.id,
        'kind': plan.kind.name,
        'timestampMillis': plan.targetLocal.millisecondsSinceEpoch,
        'title': 'Sreadya',
        'body': body,
        'repeatDaily': plan.repeatDaily,
        'label': plan.label,
      });
    } on MissingPluginException {
      throw StateError('Reminder platform adapter is unavailable.');
    }
  }

  Future<void> cancel(String id) async {
    try {
      await _channel.invokeMethod<void>('cancel', {'id': id});
    } on MissingPluginException {
      return;
    }
  }

  Future<String?> consumePendingAction() async {
    try {
      return await _channel.invokeMethod<String>('consumePendingAction');
    } on MissingPluginException {
      return null;
    }
  }

  Future<List<Map<String, Object?>>> pending() async {
    try {
      final values =
          await _channel.invokeListMethod<Map<Object?, Object?>>('pending') ??
          const [];
      return values
          .map(
            (entry) =>
                entry.map((key, value) => MapEntry(key.toString(), value)),
          )
          .toList(growable: false);
    } on MissingPluginException {
      return const [];
    }
  }
}
