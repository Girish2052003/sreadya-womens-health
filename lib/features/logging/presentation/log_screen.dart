import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers.dart';
import '../../cycle/domain/cycle_models.dart';

class _ObservationSpec {
  const _ObservationSpec(
    this.kind,
    this.label,
    this.icon, {
    this.unit,
    this.useSeverity = true,
  });
  final ObservationKind kind;
  final String label;
  final IconData icon;
  final String? unit;
  final bool useSeverity;
}

class LogScreen extends ConsumerWidget {
  const LogScreen({super.key});

  static const _symptoms = <_ObservationSpec>[
    _ObservationSpec(ObservationKind.cramps, 'Cramps', Icons.bolt_outlined),
    _ObservationSpec(
      ObservationKind.headache,
      'Headache',
      Icons.psychology_alt_outlined,
    ),
    _ObservationSpec(
      ObservationKind.migraine,
      'Migraine',
      Icons.flash_on_outlined,
    ),
    _ObservationSpec(
      ObservationKind.backPain,
      'Back pain',
      Icons.accessibility_new,
    ),
    _ObservationSpec(
      ObservationKind.breastTenderness,
      'Breast tenderness',
      Icons.favorite_border,
    ),
    _ObservationSpec(
      ObservationKind.bloating,
      'Bloating',
      Icons.circle_outlined,
    ),
    _ObservationSpec(
      ObservationKind.acne,
      'Acne',
      Icons.face_retouching_natural,
    ),
    _ObservationSpec(ObservationKind.nausea, 'Nausea', Icons.sick_outlined),
    _ObservationSpec(
      ObservationKind.digestion,
      'Digestion',
      Icons.restaurant_outlined,
    ),
    _ObservationSpec(
      ObservationKind.fatigue,
      'Fatigue',
      Icons.battery_2_bar_outlined,
    ),
    _ObservationSpec(
      ObservationKind.dizziness,
      'Dizziness',
      Icons.rotate_right,
    ),
    _ObservationSpec(
      ObservationKind.appetite,
      'Appetite',
      Icons.restaurant_menu_outlined,
    ),
    _ObservationSpec(
      ObservationKind.cravings,
      'Cravings',
      Icons.cookie_outlined,
    ),
  ];

  static const _wellbeing = <_ObservationSpec>[
    _ObservationSpec(
      ObservationKind.sleep,
      'Sleep quality',
      Icons.bedtime_outlined,
    ),
    _ObservationSpec(
      ObservationKind.energy,
      'Energy',
      Icons.battery_charging_full,
    ),
    _ObservationSpec(ObservationKind.stress, 'Stress', Icons.air_outlined),
    _ObservationSpec(ObservationKind.mood, 'Mood', Icons.mood_outlined),
    _ObservationSpec(
      ObservationKind.anxiety,
      'Anxiety',
      Icons.psychology_outlined,
    ),
    _ObservationSpec(
      ObservationKind.irritability,
      'Irritability',
      Icons.sentiment_dissatisfied_outlined,
    ),
    _ObservationSpec(ObservationKind.libido, 'Libido', Icons.favorite_outline),
  ];

  static const _reproductive = <_ObservationSpec>[
    _ObservationSpec(
      ObservationKind.vaginalDischarge,
      'Vaginal discharge',
      Icons.water_drop_outlined,
      useSeverity: false,
    ),
    _ObservationSpec(
      ObservationKind.cervicalMucus,
      'Cervical mucus',
      Icons.water_outlined,
      useSeverity: false,
    ),
    _ObservationSpec(
      ObservationKind.ovulationTest,
      'Ovulation test',
      Icons.science_outlined,
      useSeverity: false,
    ),
    _ObservationSpec(
      ObservationKind.pregnancyTest,
      'Pregnancy test',
      Icons.biotech_outlined,
      useSeverity: false,
    ),
    _ObservationSpec(
      ObservationKind.sexualActivity,
      'Sexual activity',
      Icons.favorite,
      useSeverity: false,
    ),
    _ObservationSpec(
      ObservationKind.protection,
      'Protection used',
      Icons.verified_user_outlined,
      useSeverity: false,
    ),
    _ObservationSpec(
      ObservationKind.contraception,
      'Contraception',
      Icons.shield_outlined,
      useSeverity: false,
    ),
  ];

  static const _measurements = <_ObservationSpec>[
    _ObservationSpec(
      ObservationKind.basalBodyTemperature,
      'Basal temperature',
      Icons.thermostat_outlined,
      unit: '°C',
      useSeverity: false,
    ),
    _ObservationSpec(
      ObservationKind.weight,
      'Weight',
      Icons.monitor_weight_outlined,
      unit: 'kg',
      useSeverity: false,
    ),
    _ObservationSpec(
      ObservationKind.exercise,
      'Exercise',
      Icons.directions_run,
      unit: 'min',
      useSeverity: false,
    ),
    _ObservationSpec(
      ObservationKind.water,
      'Water',
      Icons.local_drink_outlined,
      unit: 'mL',
      useSeverity: false,
    ),
  ];

  static const _medications = <_ObservationSpec>[
    _ObservationSpec(
      ObservationKind.medication,
      'Medication',
      Icons.medication_outlined,
      useSeverity: false,
    ),
    _ObservationSpec(
      ObservationKind.supplement,
      'Supplement',
      Icons.local_pharmacy_outlined,
      useSeverity: false,
    ),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Log today')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'How are you today?',
            style: Theme.of(context).textTheme.headlineSmall
                ?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 6),
          const Text(
            'Everything below is optional. Save only what is useful to you.',
          ),
          const SizedBox(height: 20),
          _FlowSection(ref: ref),
          const SizedBox(height: 24),
          _group(context, ref, 'Symptoms', _symptoms),
          _group(context, ref, 'Mood, sleep & wellbeing', _wellbeing),
          _group(context, ref, 'Reproductive observations', _reproductive),
          _group(context, ref, 'Measurements & habits', _measurements),
          _group(context, ref, 'Medication & supplements', _medications),
          FilledButton.tonalIcon(
            onPressed: () => _openObservation(
              context,
              ref,
              const _ObservationSpec(
                ObservationKind.dailyNote,
                'Private daily note',
                Icons.note_alt_outlined,
                useSeverity: false,
              ),
            ),
            icon: const Icon(Icons.note_alt_outlined),
            label: const Text('Add private note'),
          ),
          const SizedBox(height: 8),
          FilledButton.tonalIcon(
            onPressed: () => _openObservation(
              context,
              ref,
              const _ObservationSpec(
                ObservationKind.custom,
                'Custom observation',
                Icons.add,
                useSeverity: false,
              ),
            ),
            icon: const Icon(Icons.add),
            label: const Text('Add custom observation'),
          ),
          const SizedBox(height: 24),
          const Text(
            'Sreva records observations. It does not turn a symptom log into a diagnosis.',
          ),
        ],
      ),
    );
  }

  Widget _group(
    BuildContext context,
    WidgetRef ref,
    String title,
    List<_ObservationSpec> values,
  ) => Padding(
    padding: const EdgeInsets.only(bottom: 24),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.titleLarge
              ?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 10),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: values.length,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            childAspectRatio: 2.15,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
          ),
          itemBuilder: (_, index) {
            final item = values[index];
            return OutlinedButton.icon(
              onPressed: () => _openObservation(context, ref, item),
              icon: Icon(item.icon),
              label: Text(item.label),
            );
          },
        ),
      ],
    ),
  );

  Future<void> _openObservation(
    BuildContext context,
    WidgetRef ref,
    _ObservationSpec spec,
  ) async {
    ObservationSeverity severity = ObservationSeverity.mild;
    final valueController = TextEditingController();
    final noteController = TextEditingController();
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => SafeArea(
          child: Padding(
            padding: EdgeInsets.fromLTRB(
              20,
              20,
              20,
              MediaQuery.viewInsetsOf(context).bottom + 20,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(spec.label, style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 12),
                if (spec.useSeverity)
                  SegmentedButton<ObservationSeverity>(
                    segments: const [
                      ButtonSegment(
                        value: ObservationSeverity.mild,
                        label: Text('Mild'),
                      ),
                      ButtonSegment(
                        value: ObservationSeverity.moderate,
                        label: Text('Moderate'),
                      ),
                      ButtonSegment(
                        value: ObservationSeverity.severe,
                        label: Text('Severe'),
                      ),
                    ],
                    selected: {severity},
                    onSelectionChanged: (value) =>
                        setState(() => severity = value.first),
                  ),
                if (spec.unit != null) ...[
                  const SizedBox(height: 12),
                  TextField(
                    controller: valueController,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'[-0-9.,]')),
                    ],
                    decoration: InputDecoration(
                      labelText: '${spec.label} (${spec.unit})',
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                TextField(
                  controller: noteController,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'Private detail / result (optional)',
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => Navigator.pop(context, true),
                  child: const Text('Save on this device'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    if (saved == true) {
      final numeric = valueController.text.trim().isEmpty
          ? null
          : double.tryParse(valueController.text.trim().replaceAll(',', '.'));
      await ref
          .read(healthActionsProvider)
          .addObservation(
            kind: spec.kind,
            occurredAt: DateTime.now(),
            severity: spec.useSeverity ? severity : null,
            numericValue: numeric,
            unit: numeric == null ? null : spec.unit,
            label: spec.label,
            note: noteController.text.trim().isEmpty
                ? null
                : noteController.text.trim(),
          );
      if (context.mounted)
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('${spec.label} saved locally.')));
    }
    valueController.dispose();
    noteController.dispose();
  }
}

class _FlowSection extends StatelessWidget {
  const _FlowSection({required this.ref});
  final WidgetRef ref;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        'Menstrual flow',
        style: Theme.of(context).textTheme.titleLarge
            ?.copyWith(fontWeight: FontWeight.w700),
      ),
      const SizedBox(height: 10),
      Wrap(
        spacing: 8,
        runSpacing: 8,
        children: FlowLevel.values
            .map(
              (flow) => ActionChip(
                avatar: const Icon(Icons.water_drop_outlined, size: 18),
                label: Text(flow.name),
                onPressed: () async {
                  await ref
                      .read(healthActionsProvider)
                      .addObservation(
                        kind: ObservationKind.menstrualFlow,
                        occurredAt: DateTime.now(),
                        flowLevel: flow,
                        label: '${flow.name} flow',
                      );
                  if (context.mounted)
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('${flow.name} flow saved locally.'),
                      ),
                    );
                },
              ),
            )
            .toList(),
      ),
    ],
  );
}
