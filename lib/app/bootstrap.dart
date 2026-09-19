import 'package:flutter/material.dart';

import '../brand/sreadya_brand.dart';
import '../brand/sreadya_theme.dart';
import '../core/platform/privacy_platform.dart';
import '../features/onboarding/presentation/onboarding_screen.dart';
import '../features/privacy/data/app_lock_service.dart';
import '../features/privacy/data/pin_lock_service.dart';
import '../features/settings/data/privacy_settings_store.dart';
import 'sreadya_app.dart';
import 'sreadya_bloom.dart';

class SreadyaBootstrap extends StatefulWidget {
  const SreadyaBootstrap({super.key});

  @override
  State<SreadyaBootstrap> createState() => _SreadyaBootstrapState();
}

class _SreadyaBootstrapState extends State<SreadyaBootstrap>
    with WidgetsBindingObserver {
  late Future<bool> _onboarding = _loadOnboardingAfterBloom();
  bool _unlocked = false;
  bool _unlockAttempted = false;
  DateTime? _backgroundedAt;

  Future<bool> _loadOnboardingAfterBloom() async {
    final values = await Future.wait<bool>([
      OnboardingStore().isComplete(),
      Future<bool>.delayed(
        const Duration(milliseconds: 1500),
        () => true,
      ),
    ]);
    return values.first;
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.inactive ||
        state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden) {
      _backgroundedAt ??= DateTime.now();
      PrivacyPlatform().setSensitiveScreen(true);
      return;
    }
    if (state == AppLifecycleState.resumed) {
      PrivacyPlatform().setSensitiveScreen(false);
      _applyAutoLock();
    }
  }

  Future<void> _applyAutoLock() async {
    final backgroundedAt = _backgroundedAt;
    _backgroundedAt = null;
    if (backgroundedAt == null) return;
    final settings = await PrivacySettingsStore().read();
    if (!settings.appLockEnabled) return;
    final elapsed = DateTime.now().difference(backgroundedAt);
    if (elapsed >= Duration(minutes: settings.autoLockMinutes)) {
      if (!mounted) return;
      setState(() {
        _unlocked = false;
        _unlockAttempted = false;
      });
    }
  }

  Future<void> _unlock() async {
    final settings = await PrivacySettingsStore().read();
    if (!settings.appLockEnabled) {
      if (mounted) {
        setState(() {
          _unlocked = true;
          _unlockAttempted = true;
        });
      }
      return;
    }
    final service = AppLockService();
    final available = await service.isAvailable();
    final unlocked = available && await service.unlock();
    if (mounted) {
      setState(() {
        _unlocked = unlocked;
        _unlockAttempted = true;
      });
    }
  }

  Future<void> _unlockWithPin() async {
    final controller = TextEditingController();
    final pin = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Enter Sreadya PIN'),
        content: TextField(
          controller: controller,
          obscureText: true,
          autofocus: true,
          keyboardType: TextInputType.number,
          maxLength: 10,
          decoration: const InputDecoration(labelText: '6–10 digit PIN'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('Unlock'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (pin == null) return;
    final ok = await PinLockService().verify(pin);
    if (!mounted) return;
    if (ok) {
      setState(() => _unlocked = true);
    } else {
      const messengerText = 'Incorrect Sreadya PIN.';
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text(messengerText)));
    }
  }

  MaterialApp _frame(Widget home) => MaterialApp(
    title: 'Sreadya',
    debugShowCheckedModeBanner: false,
    theme: sreadyaTheme(brightness: Brightness.light),
    darkTheme: sreadyaTheme(brightness: Brightness.dark),
    themeMode: ThemeMode.system,
    home: home,
  );

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<bool>(
      future: _onboarding,
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return _frame(const SreadyaBloom());
        }
        if (snapshot.data != true) {
          return _frame(
            OnboardingScreen(
              onComplete: () =>
                  setState(() => _onboarding = Future.value(true)),
            ),
          );
        }
        if (!_unlockAttempted) {
          WidgetsBinding.instance.addPostFrameCallback((_) => _unlock());
          return _frame(
            const SreadyaBloom(subtitle: 'Opening your private space…'),
          );
        }
        if (!_unlocked) {
          return _frame(
            Scaffold(
              body: DecoratedBox(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      SreadyaBrand.pearl,
                      Color(0xFFFFE5EF),
                      Color(0xFFFFF8FB),
                    ],
                  ),
                ),
                child: SafeArea(
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 430),
                        child: Card(
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const SreadyaBrandIcon(size: 88),
                                const SizedBox(height: 20),
                                const Text(
                                  'Sreadya is locked',
                                  style: TextStyle(
                                    fontSize: 26,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                const Text(
                                  'Unlock your private space with device authentication or your Sreadya PIN.',
                                  textAlign: TextAlign.center,
                                ),
                                const SizedBox(height: 20),
                                FilledButton.icon(
                                  onPressed: _unlock,
                                  icon: const Icon(Icons.face),
                                  label: const Text('Use device authentication'),
                                ),
                                FutureBuilder<bool>(
                                  future: PinLockService().isConfigured(),
                                  builder: (context, pin) => pin.data == true
                                      ? Padding(
                                          padding: const EdgeInsets.only(top: 8),
                                          child: OutlinedButton.icon(
                                            onPressed: _unlockWithPin,
                                            icon: const Icon(Icons.pin_outlined),
                                            label: const Text('Use Sreadya PIN'),
                                          ),
                                        )
                                      : const SizedBox.shrink(),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          );
        }
        return const SreadyaApp();
      },
    );
  }
}
