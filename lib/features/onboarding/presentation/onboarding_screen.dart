import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../app/providers.dart';
import '../../../core/settings/local_settings_store.dart';

class OnboardingStore {
  OnboardingStore({LocalSettingsStore? settings}) : _settings = settings ?? LocalSettingsStore();
  static const _key = 'sreva.onboarding.complete.v1';
  final LocalSettingsStore _settings;
  Future<bool> isComplete() => _settings.readBool(_key);
  Future<void> complete() => _settings.writeBool(_key, true);
}

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({required this.onComplete, super.key});
  final VoidCallback onComplete;

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final List<DateTime> _starts = [];
  bool _saving = false;

  Future<void> _addDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: now.subtract(const Duration(days: 28)),
      firstDate: DateTime(now.year - 5),
      lastDate: now,
    );
    if (picked != null && !_starts.any((d) => DateUtils.isSameDay(d, picked))) {
      setState(() {
        _starts.add(picked);
        _starts.sort();
      });
    }
  }

  Future<void> _finish() async {
    setState(() => _saving = true);
    try {
      for (final date in _starts) {
        await ref.read(healthActionsProvider).startPeriod(date);
      }
      await ref.read(reminderSchedulerProvider).requestPermission();
      await OnboardingStore().complete();
      widget.onComplete();
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Setup could not finish: $error')));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const SizedBox(height: 28),
            Text('Sreva', style: Theme.of(context).textTheme.displaySmall?.copyWith(fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Text('Your cycle belongs to you.', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 20),
            const Card(child: Padding(padding: EdgeInsets.all(18), child: Text('Sreva stores and processes reproductive-health information on this device. No account is required. Predictions are estimates, not medical diagnoses or contraceptive guarantees.'))),
            const SizedBox(height: 24),
            Text('Add recent period starts', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            const Text('Two dates unlock a first prediction; six or more improve confidence. You can skip this and add history later.'),
            const SizedBox(height: 12),
            if (_starts.isNotEmpty)
              Card(child: Column(children: _starts.map((date) => ListTile(
                leading: const Icon(Icons.water_drop_outlined),
                title: Text(DateFormat.yMMMd().format(date)),
                trailing: IconButton(icon: const Icon(Icons.close), onPressed: () => setState(() => _starts.remove(date))),
              )).toList())),
            OutlinedButton.icon(onPressed: _addDate, icon: const Icon(Icons.add), label: const Text('Add a previous period start')),
            const SizedBox(height: 24),
            const Text('On the next step iOS/Android may ask for notification permission so Sreva can schedule your private 3-day reminder locally.'),
            const SizedBox(height: 16),
            FilledButton(onPressed: _saving ? null : _finish, child: Text(_saving ? 'Preparing your private vault…' : 'Start using Sreva')),
            const SizedBox(height: 12),
            TextButton(onPressed: _saving ? null : _finish, child: const Text('Continue without history')),
            const SizedBox(height: 20),
            const Center(child: Text('Made with care · Sreedevi Nallan Chakravathy ❤️')),
          ],
        ),
      ),
    );
  }
}
