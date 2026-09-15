import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../features/settings/domain/app_preferences.dart';

class UserFormatters {
  const UserFormatters._();

  static String formatDate(DateTime value, Locale locale) =>
      DateFormat.yMMMd(locale.toLanguageTag()).format(value);

  static String formatShortDate(DateTime value, Locale locale) =>
      DateFormat.MMMd(locale.toLanguageTag()).format(value);

  static String formatClock(
    TimeOfDay value,
    ClockPreference preference,
    BuildContext context,
  ) {
    final hour = value.hour;
    final minute = value.minute;
    switch (preference) {
      case ClockPreference.twentyFourHour:
        return '${hour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')}';
      case ClockPreference.twelveHour:
        final suffix = hour >= 12 ? 'PM' : 'AM';
        final display = hour % 12 == 0 ? 12 : hour % 12;
        return '$display:${minute.toString().padLeft(2, '0')} $suffix';
      case ClockPreference.system:
        return value.format(context);
    }
  }

  static String temperatureUnit(UnitSystem units) =>
      units == UnitSystem.metric ? '°C' : '°F';

  static String weightUnit(UnitSystem units) =>
      units == UnitSystem.metric ? 'kg' : 'lb';

  static String waterUnit(UnitSystem units) =>
      units == UnitSystem.metric ? 'mL' : 'fl oz';

  static double temperatureForStorage(double displayed, UnitSystem units) =>
      units == UnitSystem.metric ? displayed : (displayed - 32) * 5 / 9;

  static double temperatureForDisplay(double celsius, UnitSystem units) =>
      units == UnitSystem.metric ? celsius : celsius * 9 / 5 + 32;

  static double weightForStorage(double displayed, UnitSystem units) =>
      units == UnitSystem.metric ? displayed : displayed / 2.2046226218;

  static double weightForDisplay(double kilograms, UnitSystem units) =>
      units == UnitSystem.metric ? kilograms : kilograms * 2.2046226218;

  static double waterForStorage(double displayed, UnitSystem units) =>
      units == UnitSystem.metric ? displayed : displayed * 29.5735295625;

  static double waterForDisplay(double millilitres, UnitSystem units) =>
      units == UnitSystem.metric ? millilitres : millilitres / 29.5735295625;
}
