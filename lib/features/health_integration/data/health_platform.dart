import 'package:flutter/services.dart';

enum HealthDataCategory {
  menstrualFlow,
  intermenstrualBleeding,
  basalBodyTemperature,
  cervicalMucus,
  ovulationTest,
  pregnancyTest,
  sexualActivity,
}

extension HealthDataCategoryLabel on HealthDataCategory {
  String get label => switch (this) {
        HealthDataCategory.menstrualFlow => 'Menstrual flow',
        HealthDataCategory.intermenstrualBleeding => 'Intermenstrual bleeding / spotting',
        HealthDataCategory.basalBodyTemperature => 'Basal body temperature',
        HealthDataCategory.cervicalMucus => 'Cervical mucus',
        HealthDataCategory.ovulationTest => 'Ovulation tests',
        HealthDataCategory.pregnancyTest => 'Pregnancy tests',
        HealthDataCategory.sexualActivity => 'Sexual activity',
      };
}

class HealthPlatformStatus {
  const HealthPlatformStatus({
    required this.available,
    required this.authorizationRequested,
    required this.platformName,
    required this.supportedCategories,
  });
  final bool available;
  final bool authorizationRequested;
  final String platformName;
  final Set<HealthDataCategory> supportedCategories;
}

HealthDataCategory? _categoryByName(String name) {
  for (final value in HealthDataCategory.values) {
    if (value.name == name) return value;
  }
  return null;
}

class HealthPlatform {
  static const MethodChannel _channel = MethodChannel('sreva/health');

  Future<HealthPlatformStatus> status() async {
    try {
      final map = await _channel.invokeMapMethod<String, Object?>('status');
      return HealthPlatformStatus(
        available: map?['available'] == true,
        authorizationRequested: map?['authorizationRequested'] == true || map?['authorized'] == true,
        platformName: map?['platformName']?.toString() ?? 'Health platform',
        supportedCategories: ((map?['supportedCategories'] as List<Object?>?) ?? const <Object?>[])
            .map((value) => value.toString())
            .map(_categoryByName)
            .whereType<HealthDataCategory>()
            .toSet(),
      );
    } on MissingPluginException {
      return const HealthPlatformStatus(
        available: false,
        authorizationRequested: false,
        platformName: 'Unavailable',
        supportedCategories: const {},
      );
    }
  }

  Future<bool> requestAuthorization(Set<HealthDataCategory> categories) async {
    if (categories.isEmpty) return false;
    try {
      return await _channel.invokeMethod<bool>('requestAuthorization', {
            'categories': categories.map((value) => value.name).toList(),
          }) ??
          false;
    } on MissingPluginException {
      return false;
    }
  }

  Future<List<Map<String, Object?>>> readRecords({
    required Set<HealthDataCategory> categories,
    required DateTime from,
    required DateTime to,
  }) async {
    if (categories.isEmpty) return const [];
    try {
      final rows = await _channel.invokeListMethod<Map<Object?, Object?>>('readHealthRecords', {
            'categories': categories.map((value) => value.name).toList(),
            'fromMillis': from.millisecondsSinceEpoch,
            'toMillis': to.millisecondsSinceEpoch,
          }) ??
          const [];
      return rows
          .map((row) => row.map((key, value) => MapEntry(key.toString(), value)))
          .toList(growable: false);
    } on MissingPluginException {
      return const [];
    }
  }

  Future<bool> writeRecord({
    required HealthDataCategory category,
    required DateTime occurredAt,
    String? value,
    double? numericValue,
  }) async {
    try {
      return await _channel.invokeMethod<bool>('writeHealthRecord', {
            'category': category.name,
            'dateMillis': occurredAt.millisecondsSinceEpoch,
            'value': value,
            'numericValue': numericValue,
          }) ??
          false;
    } on MissingPluginException {
      return false;
    }
  }
}
