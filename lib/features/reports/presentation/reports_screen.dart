import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

import '../../../app/providers.dart';
import '../domain/report_selection.dart';

class ReportsScreen extends ConsumerStatefulWidget {
  const ReportsScreen({super.key});

  @override
  ConsumerState<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends ConsumerState<ReportsScreen> {
  late final Set<ReportCategory> _selected = {
    ...ReportSelection.safeDefault().categories,
  };
  bool _busy = false;

  Future<void> _generate(bool pdf) async {
    setState(() => _busy = true);
    try {
      final service = await ref.read(doctorReportServiceProvider.future);
      final to = DateTime.now();
      final from = DateTime(to.year - 1, to.month, to.day);
      final path = pdf
          ? await service.generatePdf(
              from: from,
              to: to,
              selection: ReportSelection(categories: _selected),
            )
          : await service.generateCsv(
              from: from,
              to: to,
              selection: ReportSelection(categories: _selected),
            );
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(path)],
          text: 'Sreva health report — shared intentionally by the user.',
        ),
      );
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Report failed: $error')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Doctor report')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Choose exactly what leaves the device. Private notes and sexual activity are off by default.',
          ),
          const SizedBox(height: 12),
          Card(
            child: Column(
              children: ReportCategory.values
                  .map(
                    (category) => CheckboxListTile(
                      value: _selected.contains(category),
                      title: Text(_label(category)),
                      subtitle: _isHighlyPrivate(category)
                          ? const Text('Highly private — explicit opt-in')
                          : null,
                      onChanged: (value) => setState(() {
                        if (value == true) {
                          _selected.add(category);
                        } else {
                          _selected.remove(category);
                        }
                      }),
                    ),
                  )
                  .toList(),
            ),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: _busy ? null : () => _generate(true),
            icon: const Icon(Icons.picture_as_pdf_outlined),
            label: const Text('Generate & share PDF locally'),
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: _busy ? null : () => _generate(false),
            icon: const Icon(Icons.table_view_outlined),
            label: const Text('Generate & share CSV locally'),
          ),
          const SizedBox(height: 16),
          const Text(
            'Sreva does not upload the report to a developer server. The operating-system share sheet controls the destination you choose.',
          ),
        ],
      ),
    );
  }

  bool _isHighlyPrivate(ReportCategory value) =>
      value == ReportCategory.privateNotes ||
      value == ReportCategory.sexualActivity;

  String _label(ReportCategory value) => switch (value) {
    ReportCategory.periods => 'Period dates',
    ReportCategory.flow => 'Flow',
    ReportCategory.symptoms => 'Symptoms',
    ReportCategory.pain => 'Pain',
    ReportCategory.medications => 'Medications & supplements',
    ReportCategory.temperature => 'Basal temperature',
    ReportCategory.ovulation => 'Ovulation observations',
    ReportCategory.privateNotes => 'Private notes',
    ReportCategory.sexualActivity => 'Sexual activity',
  };
}
