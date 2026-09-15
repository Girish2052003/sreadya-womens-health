import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

import '../../../app/providers.dart';
import '../../../core/settings/user_formatters.dart';
import '../domain/report_selection.dart';

class ReportsScreen extends ConsumerStatefulWidget {
  const ReportsScreen({super.key});

  @override
  ConsumerState<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends ConsumerState<ReportsScreen> {
  late final Set<ReportCategory> _selected = {...ReportSelection.safeDefault().categories};
  DateTime _to = DateTime.now();
  late DateTime _from = DateTime(_to.year - 1, _to.month, _to.day);
  bool _busy = false;

  Future<void> _pickRange() async {
    final range = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2000),
      lastDate: DateTime.now(),
      initialDateRange: DateTimeRange(start: _from, end: _to),
    );
    if (range != null) {
      setState(() {
        _from = range.start;
        _to = range.end;
      });
    }
  }

  Future<void> _preview() async {
    if (_selected.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select at least one report category.')),
      );
      return;
    }
    final locale = Localizations.localeOf(context);
    final selectedLabels = _selected.map(_label).toList()..sort();
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
              Text('Preview report', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 12),
              Text('Date range: ${UserFormatters.formatDate(_from, locale)} – ${UserFormatters.formatDate(_to, locale)}'),
              const SizedBox(height: 8),
              const Text('Included categories:'),
              const SizedBox(height: 4),
              ...selectedLabels.map((label) => Text('• $label')),
              const SizedBox(height: 12),
              if (!_selected.contains(ReportCategory.privateNotes))
                const Text('Private notes: excluded'),
              if (!_selected.contains(ReportCategory.sexualActivity))
                const Text('Sexual activity: excluded'),
              const SizedBox(height: 16),
              const Text('Nothing leaves the device until you choose one of the share actions below.'),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: _busy
                    ? null
                    : () async {
                        Navigator.pop(context);
                        await _generateAndShare(pdf: true);
                      },
                icon: const Icon(Icons.picture_as_pdf_outlined),
                label: const Text('Share previewed PDF'),
              ),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: _busy
                    ? null
                    : () async {
                        Navigator.pop(context);
                        await _generateAndShare(pdf: false);
                      },
                icon: const Icon(Icons.table_view_outlined),
                label: const Text('Share previewed CSV'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _generateAndShare({required bool pdf}) async {
    setState(() => _busy = true);
    try {
      final service = await ref.read(doctorReportServiceProvider.future);
      final selection = ReportSelection(categories: _selected);
      final path = pdf
          ? await service.generatePdf(from: _from, to: _to, selection: selection)
          : await service.generateCsv(from: _from, to: _to, selection: selection);
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(path)],
          text: 'Sreva health report — shared intentionally by the user.',
        ),
      );
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Report failed: $error')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = Localizations.localeOf(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Doctor report')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Choose exactly what leaves the device. Private notes and sexual activity are off by default.'),
          const SizedBox(height: 12),
          Card(
            child: ListTile(
              leading: const Icon(Icons.date_range_outlined),
              title: const Text('Report date range'),
              subtitle: Text('${UserFormatters.formatDate(_from, locale)} – ${UserFormatters.formatDate(_to, locale)}'),
              trailing: const Icon(Icons.edit_calendar_outlined),
              onTap: _pickRange,
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: Column(
              children: ReportCategory.values
                  .map(
                    (category) => CheckboxListTile(
                      value: _selected.contains(category),
                      title: Text(_label(category)),
                      subtitle: _isHighlyPrivate(category) ? const Text('Highly private — explicit opt-in') : null,
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
            onPressed: _busy ? null : _preview,
            icon: const Icon(Icons.preview_outlined),
            label: Text(_busy ? 'Preparing…' : 'Preview report'),
          ),
          const SizedBox(height: 16),
          const Text('Sreva does not upload the report to a developer server. The operating-system share sheet controls the destination you choose.'),
        ],
      ),
    );
  }

  bool _isHighlyPrivate(ReportCategory value) =>
      value == ReportCategory.privateNotes || value == ReportCategory.sexualActivity;

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
