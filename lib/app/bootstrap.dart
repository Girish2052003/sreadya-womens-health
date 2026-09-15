import 'package:flutter/material.dart';

import '../features/onboarding/presentation/onboarding_screen.dart';
import '../features/privacy/data/app_lock_service.dart';
import '../features/settings/data/privacy_settings_store.dart';
import 'sreva_app.dart';

class SrevaBootstrap extends StatefulWidget {
  const SrevaBootstrap({super.key});

  @override
  State<SrevaBootstrap> createState() => _SrevaBootstrapState();
}

class _SrevaBootstrapState extends State<SrevaBootstrap> {
  late Future<bool> _onboarding = OnboardingStore().isComplete();
  bool _unlocked = false;
  bool _unlockAttempted = false;

  Future<void> _unlock() async {
    final settings = await PrivacySettingsStore().read();
    if (!settings.appLockEnabled) {
      if (mounted) setState(() { _unlocked = true; _unlockAttempted = true; });
      return;
    }
    final available = await AppLockService().isAvailable();
    final unlocked = !available || await AppLockService().unlock();
    if (mounted) setState(() {
      _unlocked = unlocked;
      _unlockAttempted = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<bool>(
      future: _onboarding,
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const MaterialApp(home: Scaffold(body: Center(child: CircularProgressIndicator())));
        }
        if (snapshot.data != true) {
          return MaterialApp(
            debugShowCheckedModeBanner: false,
            home: OnboardingScreen(onComplete: () => setState(() => _onboarding = Future.value(true))),
          );
        }
        if (!_unlockAttempted) {
          WidgetsBinding.instance.addPostFrameCallback((_) => _unlock());
          return const MaterialApp(home: Scaffold(body: Center(child: CircularProgressIndicator())));
        }
        if (!_unlocked) {
          return MaterialApp(
            debugShowCheckedModeBanner: false,
            home: Scaffold(
              body: SafeArea(
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(Icons.lock_outline, size: 56),
                      const SizedBox(height: 16),
                      const Text('Sreva is locked', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 12),
                      FilledButton.icon(onPressed: _unlock, icon: const Icon(Icons.face), label: const Text('Unlock privately')),
                    ]),
                  ),
                ),
              ),
            ),
          );
        }
        return const SrevaApp();
      },
    );
  }
}
