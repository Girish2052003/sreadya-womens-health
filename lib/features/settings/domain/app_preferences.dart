enum UnitSystem { metric, imperial }

enum ClockPreference { system, twelveHour, twentyFourHour }

enum ThemePreference { system, light, dark }

class AppPreferences {
  const AppPreferences({
    this.unitSystem = UnitSystem.metric,
    this.clockPreference = ClockPreference.system,
    this.themePreference = ThemePreference.system,
    this.highContrast = false,
  });

  final UnitSystem unitSystem;
  final ClockPreference clockPreference;
  final ThemePreference themePreference;
  final bool highContrast;

  AppPreferences copyWith({
    UnitSystem? unitSystem,
    ClockPreference? clockPreference,
    ThemePreference? themePreference,
    bool? highContrast,
  }) => AppPreferences(
    unitSystem: unitSystem ?? this.unitSystem,
    clockPreference: clockPreference ?? this.clockPreference,
    themePreference: themePreference ?? this.themePreference,
    highContrast: highContrast ?? this.highContrast,
  );

  Map<String, Object?> toJson() => {
    'unitSystem': unitSystem.name,
    'clockPreference': clockPreference.name,
    'themePreference': themePreference.name,
    'highContrast': highContrast,
  };

  static AppPreferences fromJson(Map<String, Object?> json) => AppPreferences(
    unitSystem: UnitSystem.values.firstWhere(
      (value) => value.name == json['unitSystem'],
      orElse: () => UnitSystem.metric,
    ),
    clockPreference: ClockPreference.values.firstWhere(
      (value) => value.name == json['clockPreference'],
      orElse: () => ClockPreference.system,
    ),
    themePreference: ThemePreference.values.firstWhere(
      (value) => value.name == json['themePreference'],
      orElse: () => ThemePreference.system,
    ),
    highContrast: json['highContrast'] == true,
  );
}
