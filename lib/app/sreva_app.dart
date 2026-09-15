import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/assistant/presentation/assistant_screen.dart';
import '../features/backup/presentation/backup_screen.dart';
import '../features/calendar/presentation/calendar_screen.dart';
import '../features/diagnostics/presentation/diagnostics_screen.dart';
import '../features/health_integration/presentation/health_integration_screen.dart';
import '../features/home/presentation/home_screen.dart';
import '../features/insights/presentation/insights_screen.dart';
import '../features/life_stage/presentation/life_stage_screen.dart';
import '../features/logging/presentation/log_screen.dart';
import '../features/more/presentation/more_screen.dart';
import '../features/partner/presentation/partner_screen.dart';
import '../features/predictions/presentation/prediction_details_screen.dart';
import '../features/privacy/presentation/pin_lock_screen.dart';
import '../features/privacy/presentation/privacy_center_screen.dart';
import '../features/reminders/presentation/reminders_screen.dart';
import '../features/reports/presentation/reports_screen.dart';
import '../features/settings/domain/app_preferences.dart';
import '../features/settings/presentation/settings_screen.dart';
import '../l10n/generated/app_localizations.dart';
import 'providers.dart';
import 'sreva_shell.dart';

final GoRouter _router = GoRouter(
  initialLocation: '/',
  routes: [
    StatefulShellRoute.indexedStack(
      builder: (context, state, navigationShell) =>
          SrevaShell(navigationShell: navigationShell),
      branches: [
        StatefulShellBranch(
          routes: [GoRoute(path: '/', builder: (_, _) => const HomeScreen())],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/calendar',
              builder: (_, _) => const CalendarScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [GoRoute(path: '/log', builder: (_, _) => const LogScreen())],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/insights',
              builder: (_, _) => const InsightsScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(path: '/more', builder: (_, _) => const MoreScreen()),
          ],
        ),
      ],
    ),
    GoRoute(
      path: '/prediction',
      builder: (_, _) => const PredictionDetailsScreen(),
    ),
    GoRoute(
      path: '/more/reminders',
      builder: (_, _) => const RemindersScreen(),
    ),
    GoRoute(
      path: '/more/assistant',
      builder: (_, _) => const AssistantScreen(),
    ),
    GoRoute(
      path: '/more/life-stage',
      builder: (_, _) => const LifeStageScreen(),
    ),
    GoRoute(
      path: '/more/health',
      builder: (_, _) => const HealthIntegrationScreen(),
    ),
    GoRoute(path: '/more/reports', builder: (_, _) => const ReportsScreen()),
    GoRoute(path: '/more/partner', builder: (_, _) => const PartnerScreen()),
    GoRoute(
      path: '/more/privacy',
      builder: (_, _) => const PrivacyCenterScreen(),
    ),
    GoRoute(path: '/more/pin', builder: (_, _) => const PinLockScreen()),
    GoRoute(path: '/more/backup', builder: (_, _) => const BackupScreen()),
    GoRoute(
      path: '/more/diagnostics',
      builder: (_, _) => const DiagnosticsScreen(),
    ),
    GoRoute(path: '/more/settings', builder: (_, _) => const SettingsScreen()),
  ],
);

class SrevaApp extends ConsumerStatefulWidget {
  const SrevaApp({super.key});

  @override
  ConsumerState<SrevaApp> createState() => _SrevaAppState();
}

class _SrevaAppState extends ConsumerState<SrevaApp> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback(
      (_) => _consumeNotificationAction(),
    );
  }

  Future<void> _consumeNotificationAction() async {
    final action = await ref
        .read(reminderSchedulerProvider)
        .consumePendingAction();
    if (action != 'periodStarted') return;
    try {
      await ref.read(healthActionsProvider).startPeriod(DateTime.now());
    } on StateError {
      // Existing overlapping history means this action is already represented.
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(reminderReconciliationProvider);
    final preferences = ref
        .watch(appPreferencesProvider)
        .when(
          data: (value) => value,
          loading: () => const AppPreferences(),
          error: (_, _) => const AppPreferences(),
        );
    final themeMode = switch (preferences.themePreference) {
      ThemePreference.system => ThemeMode.system,
      ThemePreference.light => ThemeMode.light,
      ThemePreference.dark => ThemeMode.dark,
    };
    final lightScheme = ColorScheme.fromSeed(
      seedColor: const Color(0xFF9D426B),
      brightness: Brightness.light,
      contrastLevel: preferences.highContrast ? 1.0 : 0.0,
    );
    final darkScheme = ColorScheme.fromSeed(
      seedColor: const Color(0xFFE59AB9),
      brightness: Brightness.dark,
      contrastLevel: preferences.highContrast ? 1.0 : 0.0,
    );
    return MaterialApp.router(
      title: 'Sreva',
      debugShowCheckedModeBanner: false,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: AppLocalizations.supportedLocales,
      themeMode: themeMode,
      theme: ThemeData(
        colorScheme: lightScheme,
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFFFFBFD),
        cardTheme: const CardThemeData(margin: EdgeInsets.zero),
        inputDecorationTheme: const InputDecorationTheme(
          border: OutlineInputBorder(),
        ),
      ),
      darkTheme: ThemeData(colorScheme: darkScheme, useMaterial3: true),
      routerConfig: _router,
    );
  }
}
