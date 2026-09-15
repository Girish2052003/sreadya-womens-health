import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers.dart';
import '../domain/life_stage.dart';

class LifeStageScreen extends ConsumerWidget {
  const LifeStageScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref.watch(lifeStageProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Life stage')),
      body: selected.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Unable to load preference: $e')),
        data: (current) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text(
              'Choose the context that best fits now. Changing modes never deletes your history.',
            ),
            const SizedBox(height: 12),
            RadioGroup<LifeStageMode>(
              groupValue: current,
              onChanged: (value) async {
                if (value == null) return;
                await ref.read(lifeStageStoreProvider).write(value);
                ref.invalidate(lifeStageProvider);
              },
              child: Card(
                child: Column(
                  children: LifeStageMode.values
                      .map(
                        (mode) => RadioListTile<LifeStageMode>(
                          value: mode,
                          title: Text(mode.label),
                          subtitle: Text(_description(mode)),
                        ),
                      )
                      .toList(),
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Text(
                  'Sreva’s life-stage modes organize tracking and reminders. They do not diagnose pregnancy, fertility, menopause, or any health condition.',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _description(LifeStageMode mode) => switch (mode) {
    LifeStageMode.cycleTracking =>
      'Periods, symptoms, predictions and reminders.',
    LifeStageMode.tryingToConceive =>
      'Adds fertility observations, tests, temperature and cervical mucus.',
    LifeStageMode.pregnancy =>
      'Pauses cycle prediction and focuses on pregnancy-related personal tracking.',
    LifeStageMode.postpartum =>
      'Postpartum recovery context without deleting prior cycles.',
    LifeStageMode.breastfeeding =>
      'Breastfeeding context alongside postpartum observations.',
    LifeStageMode.perimenopause =>
      'Tracks cycle changes and symptoms with wider prediction uncertainty.',
    LifeStageMode.menopauseTransition =>
      'Focuses on symptoms and history instead of routine period prediction.',
    LifeStageMode.hormonalContraception =>
      'Records contraception context and relevant reminders.',
  };
}
