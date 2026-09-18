import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';

import '../../../app/providers.dart';
import '../domain/partner_share.dart';

class PartnerScreen extends ConsumerStatefulWidget {
  const PartnerScreen({super.key});

  @override
  ConsumerState<PartnerScreen> createState() => _PartnerScreenState();
}

class _PartnerScreenState extends ConsumerState<PartnerScreen> {
  final Set<PartnerShareCategory> _selected = {PartnerShareCategory.prediction};

  Future<String?> _buildSummary() async {
    final prediction = await ref.read(predictionProvider.future);
    final periods = await ref.read(periodsProvider.future);
    final observations = await ref.read(observationsProvider.future);
    final pending = await ref.read(reminderSchedulerProvider).pending();

    String? predictionWindow;
    if (prediction != null) {
      predictionWindow =
          '${DateFormat.MMMd().format(prediction.windowStart)} – ${DateFormat.MMMd().format(prediction.windowEnd)}';
    }

    String? cyclePhase;
    if (periods.isNotEmpty) {
      final today = DateTime.now();
      final latest = periods.last.start;
      final day =
          DateTime(
            today.year,
            today.month,
            today.day,
          ).difference(DateTime(latest.year, latest.month, latest.day)).inDays +
          1;
      if (day > 0) cyclePhase = 'cycle day $day';
    }

    String? selectedReminder;
    if (pending.isNotEmpty) {
      final millis = pending.first['timestampMillis'];
      if (millis is num) {
        selectedReminder = DateFormat.yMMMd().add_Hm().format(
          DateTime.fromMillisecondsSinceEpoch(millis.toInt()),
        );
      } else {
        selectedReminder = 'A local reminder is scheduled';
      }
    }

    final today = DateTime.now();
    final todayStart = DateTime(today.year, today.month, today.day);
    final todayEnd = todayStart
        .add(const Duration(days: 1))
        .subtract(const Duration(milliseconds: 1));
    final wellnessLabels = observations
        .where(
          (item) =>
              !item.occurredAt.isBefore(todayStart) &&
              !item.occurredAt.isAfter(todayEnd),
        )
        .where(
          (item) => const {
            'mood',
            'energy',
            'sleep',
            'stress',
            'fatigue',
          }.contains(item.kind.name),
        )
        .map((item) => item.label ?? item.kind.name)
        .toSet()
        .take(3)
        .toList();
    final selectedWellness = wellnessLabels.isEmpty
        ? null
        : wellnessLabels.join(', ');

    if (_selected.contains(PartnerShareCategory.prediction) &&
        predictionWindow == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Add enough cycle history for a prediction before sharing that category.',
            ),
          ),
        );
      }
      return null;
    }

    return PartnerShareGrant(categories: _selected).buildSummary(
      predictionWindow: predictionWindow,
      cyclePhase: cyclePhase,
      selectedReminder: selectedReminder,
      selectedWellness: selectedWellness,
    );
  }

  Future<void> _preview() async {
    final text = await _buildSummary();
    if (text == null || !mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsetsDirectional.fromSTEB(20, 20, 20, 28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Review before sharing',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 12),
              SelectableText(text),
              const SizedBox(height: 20),
              Center(
                child: Semantics(
                  label: 'QR code containing only the reviewed Sreadya partner summary',
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: QrImageView(
                        data: text,
                        version: QrVersions.auto,
                        size: 210,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              FilledButton.icon(
                onPressed: () async {
                  Navigator.pop(context);
                  await SharePlus.instance.share(
                    ShareParams(text: text, title: 'Sreadya shared summary'),
                  );
                },
                icon: const Icon(Icons.ios_share),
                label: const Text('Open system share sheet'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Partner sharing')),
      body: ListView(
        padding: const EdgeInsetsDirectional.fromSTEB(16, 16, 16, 24),
        children: [
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Nothing is shared automatically. The Sreadya user selects categories, reviews the exact summary/QR, then explicitly opens the system share sheet.',
              ),
            ),
          ),
          const SizedBox(height: 12),
          ...PartnerShareCategory.values.map(
            (category) => CheckboxListTile(
              value: _selected.contains(category),
              title: Text(_label(category)),
              onChanged: (value) => setState(() {
                if (value == true) {
                  _selected.add(category);
                } else {
                  _selected.remove(category);
                }
              }),
            ),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: _selected.isEmpty ? null : _preview,
            icon: const Icon(Icons.qr_code_2),
            label: const Text('Review summary & QR'),
          ),
          const SizedBox(height: 16),
          const Text(
            'Sexual activity, fertility tests, private notes and pregnancy data are never part of the V1 partner summary.',
          ),
        ],
      ),
    );
  }

  String _label(PartnerShareCategory value) => switch (value) {
    PartnerShareCategory.prediction => 'Predicted period window',
    PartnerShareCategory.cyclePhase => 'Cycle day',
    PartnerShareCategory.selectedReminder => 'Selected reminder status',
    PartnerShareCategory.selectedWellness => 'Selected wellness status',
  };
}
