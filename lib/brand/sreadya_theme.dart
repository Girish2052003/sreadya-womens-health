import 'package:flutter/material.dart';

import 'sreadya_brand.dart';

ThemeData sreadyaTheme({
  required Brightness brightness,
  bool highContrast = false,
}) {
  final dark = brightness == Brightness.dark;
  final scheme = ColorScheme.fromSeed(
    seedColor: dark ? const Color(0xFFF18CB1) : SreadyaBrand.rose,
    brightness: brightness,
    contrastLevel: highContrast ? 1.0 : 0.0,
  );

  final cardColor = dark ? const Color(0xFF2B2026) : Colors.white;
  final inputColor = dark ? const Color(0xFF32262C) : const Color(0xFFFFF0F5);

  return ThemeData(
    colorScheme: scheme,
    useMaterial3: true,
    scaffoldBackgroundColor: dark
        ? const Color(0xFF181215)
        : SreadyaBrand.pearl,
    canvasColor: dark ? const Color(0xFF181215) : SreadyaBrand.pearl,
    appBarTheme: const AppBarTheme(
      centerTitle: false,
      elevation: 0,
      scrolledUnderElevation: 0,
      backgroundColor: Colors.transparent,
      surfaceTintColor: Colors.transparent,
    ),
    cardTheme: CardThemeData(
      margin: EdgeInsets.zero,
      elevation: 0,
      color: cardColor,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: BorderSide(
          color: dark
              ? Colors.white.withValues(alpha: .08)
              : SreadyaBrand.crimson.withValues(alpha: .09),
        ),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      height: 76,
      elevation: 0,
      backgroundColor: dark ? const Color(0xFF231A1F) : Colors.white,
      indicatorColor: dark
          ? SreadyaBrand.rose.withValues(alpha: .28)
          : SreadyaBrand.blush,
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      labelTextStyle: WidgetStateProperty.resolveWith(
        (states) => TextStyle(
          fontWeight: states.contains(WidgetState.selected)
              ? FontWeight.w800
              : FontWeight.w600,
          fontSize: 12,
          color: states.contains(WidgetState.selected)
              ? scheme.primary
              : scheme.onSurfaceVariant,
        ),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(0, 52),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        textStyle: const TextStyle(fontWeight: FontWeight.w800),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(0, 52),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        side: BorderSide(color: scheme.outlineVariant),
        textStyle: const TextStyle(fontWeight: FontWeight.w700),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: inputColor,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: BorderSide(color: scheme.outlineVariant),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: BorderSide(color: scheme.primary, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    ),
    chipTheme: ChipThemeData(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      side: BorderSide(color: scheme.outlineVariant),
    ),
    dividerTheme: DividerThemeData(color: scheme.outlineVariant),
  );
}
