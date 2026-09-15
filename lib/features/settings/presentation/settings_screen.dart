import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers.dart';
import '../domain/app_preferences.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  Future<void> _save(WidgetRef ref, AppPreferences value) async {
    await ref.read(appPreferencesStoreProvider).write(value);
    ref.invalidate(appPreferencesProvider);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final preferences = ref.watch(appPreferencesProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Settings & accessibility')),
      body: preferences.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Settings unavailable: $error')),
        data: (settings) => ListView(
          padding: const EdgeInsetsDirectional.fromSTEB(16, 16, 16, 24),
          children: [
            Text('Appearance', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            SegmentedButton<ThemePreference>(
              segments: const [
                ButtonSegment(value: ThemePreference.system, label: Text('System'), icon: Icon(Icons.brightness_auto_outlined)),
                ButtonSegment(value: ThemePreference.light, label: Text('Light'), icon: Icon(Icons.light_mode_outlined)),
                ButtonSegment(value: ThemePreference.dark, label: Text('Dark'), icon: Icon(Icons.dark_mode_outlined)),
              ],
              selected: {settings.themePreference},
              onSelectionChanged: (values) => _save(ref, settings.copyWith(themePreference: values.first)),
            ),
            const SizedBox(height: 12),
            SwitchListTile(
              value: settings.highContrast,
              title: const Text('Higher contrast'),
              subtitle: const Text('Increase visual contrast while preserving semantic status labels.'),
              onChanged: (value) => _save(ref, settings.copyWith(highContrast: value)),
            ),
            const SizedBox(height: 20),
            Text('Time & units', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            DropdownButtonFormField<ClockPreference>(
              value: settings.clockPreference,
              decoration: const InputDecoration(labelText: 'Clock format'),
              items: const [
                DropdownMenuItem(value: ClockPreference.system, child: Text('Follow device')),
                DropdownMenuItem(value: ClockPreference.twelveHour, child: Text('12-hour')),
                DropdownMenuItem(value: ClockPreference.twentyFourHour, child: Text('24-hour')),
              ],
              onChanged: (value) {
                if (value != null) _save(ref, settings.copyWith(clockPreference: value));
              },
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<UnitSystem>(
              value: settings.unitSystem,
              decoration: const InputDecoration(labelText: 'Units'),
              items: const [
                DropdownMenuItem(value: UnitSystem.metric, child: Text('Metric (°C, kg)')),
                DropdownMenuItem(value: UnitSystem.imperial, child: Text('Imperial (°F, lb)')),
              ],
              onChanged: (value) {
                if (value != null) _save(ref, settings.copyWith(unitSystem: value));
              },
            ),
            const SizedBox(height: 20),
            const Card(
              child: ListTile(
                leading: Icon(Icons.accessibility_new),
                title: Text('Accessibility'),
                subtitle: Text('Sreva follows Dynamic Type/text scaling, VoiceOver/TalkBack semantics, one-handed layouts and directional UI.'),
              ),
            ),
            const Card(
              child: ListTile(
                leading: Icon(Icons.language),
                title: Text('Languages'),
                subtitle: Text('English is the worldwide-v1 baseline. The app uses localization resources so reviewed translation packs can be added without changing health logic.'),
              ),
            ),
            const SizedBox(height: 16),
            const Text('Sreva never requires an account for core tracking. Core cycle features remain available without internet.'),
          ],
        ),
      ),
    );
  }
}
