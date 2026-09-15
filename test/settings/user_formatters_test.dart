import 'package:flutter_test/flutter_test.dart';
import 'package:sreva/core/settings/user_formatters.dart';
import 'package:sreva/features/settings/domain/app_preferences.dart';

void main() {
  test('imperial measurement conversions round trip through canonical storage', () {
    final celsius = UserFormatters.temperatureForStorage(98.6, UnitSystem.imperial);
    expect(celsius, closeTo(37.0, 0.01));
    expect(
      UserFormatters.temperatureForDisplay(celsius, UnitSystem.imperial),
      closeTo(98.6, 0.01),
    );

    final kg = UserFormatters.weightForStorage(154.324, UnitSystem.imperial);
    expect(kg, closeTo(70, 0.01));
    expect(UserFormatters.weightForDisplay(kg, UnitSystem.imperial), closeTo(154.324, 0.01));

    final ml = UserFormatters.waterForStorage(8, UnitSystem.imperial);
    expect(ml, closeTo(236.588, 0.01));
  });

  test('display units follow selected system', () {
    expect(UserFormatters.temperatureUnit(UnitSystem.metric), '°C');
    expect(UserFormatters.temperatureUnit(UnitSystem.imperial), '°F');
    expect(UserFormatters.weightUnit(UnitSystem.metric), 'kg');
    expect(UserFormatters.weightUnit(UnitSystem.imperial), 'lb');
    expect(UserFormatters.waterUnit(UnitSystem.metric), 'mL');
    expect(UserFormatters.waterUnit(UnitSystem.imperial), 'fl oz');
  });
}
