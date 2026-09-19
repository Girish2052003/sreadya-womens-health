import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers.dart';
import '../../cycle/domain/cycle_models.dart';
import '../data/health_import_service.dart';
import '../data/health_platform.dart';

class HealthIntegrationScreen extends ConsumerStatefulWidget {
  const HealthIntegrationScreen({super.key});

  @override
  ConsumerState<HealthIntegrationScreen> createState() =>
      _HealthIntegrationScreenState();
}

class _HealthIntegrationScreenState
    extends ConsumerState<HealthIntegrationScreen> {
  final Set<HealthDataCategory> _selected = {HealthDataCategory.menstrualFlow};
  List<Map<String, Object?>>? _preview;
  String? _result;
  late Future<HealthPlatformStatus> _status = ref
      .read(healthPlatformProvider)
      .status();

  Future<void> _request() async {
    final ok = await ref
        .read(healthPlatformProvider)
        .requestAuthorization(_selected, includeHistory: true);
    if (!mounted) return;
    setState(() => _status = ref.read(healthPlatformProvider).status());
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          ok
              ? 'The platform permission flow completed. Each data category remains controlled in system settings.'
              : 'The health permission flow was not completed.',
        ),
      ),
    );
  }

  Future<void> _previewImport() async {
    final platform = ref.read(healthPlatformProvider);
    final status = await platform.status();
    final now = DateTime.now();
    final from = status.historicalReadGranted
        ? DateTime(now.year - 1, now.month, now.day)
        : now.subtract(const Duration(days: 30));
    final rows = await platform.readRecords(
      categories: _selected,
      from: from,
      to: now,
    );
    if (!mounted) return;
    setState(() {
      _preview = rows;
      _result = null;
    });
  }

  Future<void> _import(HealthPlatformStatus status) async {
    final repository = await ref.read(healthRepositoryProvider.future);
    final source = status.platformName.toLowerCase().contains('apple')
        ? RecordSource.healthKit
        : RecordSource.healthConnect;
    final value = await HealthImportService(repository: repository)
        .importRecords(_preview ?? const [], source: source);
    ref.read(healthActionsProvider).refreshAll();
    if (!mounted) return;
    setState(
      () => _result =
          'Imported ${value.periodsAdded} period episodes and ${value.observationsAdded} observations; skipped ${value.duplicatesSkipped} duplicate/conflicting records.',
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Health integration')),
      body: FutureBuilder<HealthPlatformStatus>(
        future: _status,
        builder: (context, snapshot) {
          final status = snapshot.data;
          return ListView(
            padding: const EdgeInsetsDirectional.fromSTEB(16, 16, 16, 28),
            children: [
              Card(
                child: ListTile(
                  leading: const Icon(Icons.health_and_safety_outlined),
                  title: Text(
                    status?.platformName ?? 'Checking health platform…',
                  ),
                  subtitle: Text(
                    status == null
                        ? 'Checking platform availability'
                        : status.available
                        ? (status.authorizationRequested
                              ? 'A permission choice has previously been requested. The operating system remains the authority.'
                              : 'Available — choose only the categories you want to connect.')
                        : 'Not available on this platform',
                  ),
                ),
              ),
              if (status?.platformName == 'Health Connect' &&
                  status?.available == true)
                Padding(
                  padding: const EdgeInsetsDirectional.only(top: 8),
                  child: Text(
                    status!.historicalReadGranted
                        ? 'Long-history access granted — previews can include older Health Connect records.'
                        : status.historicalReadAvailable
                        ? 'Long-history access is not granted. Until you grant it, Sreadya previews only the recent 30-day window.'
                        : 'This Health Connect version does not expose long-history access. Sreadya previews only the recent 30-day window.',
                  ),
                ),
              const SizedBox(height: 16),
              Card(
                color: Theme.of(context).colorScheme.primaryContainer,
                child: const Padding(
                  padding: EdgeInsets.all(16),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.lock_person_outlined),
                      SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Before Android shows Health Connect permissions, Sreadya lets you choose the exact categories. Access is optional, core tracking still works without it, and you can revoke access later in Android settings.',
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Choose categories',
                style: Theme.of(context).textTheme.titleLarge
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 6),
              const Text(
                'Sreadya never requests every reproductive category by default. Sexual activity is off unless you explicitly select it.',
              ),
              const SizedBox(height: 8),
              ...HealthDataCategory.values.map(
                (category) => CheckboxListTile(
                  value: _selected.contains(category),
                  title: Text(category.label),
                  subtitle:
                      status != null &&
                          !status.supportedCategories.contains(category)
                      ? const Text('Not exposed by this platform')
                      : null,
                  onChanged:
                      status?.available == true &&
                          status!.supportedCategories.contains(category)
                      ? (value) => setState(() {
                          if (value == true) {
                            _selected.add(category);
                          } else {
                            _selected.remove(category);
                          }
                          _preview = null;
                        })
                      : null,
                ),
              ),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: status?.available == true && _selected.isNotEmpty
                    ? _request
                    : null,
                icon: const Icon(Icons.verified_user_outlined),
                label: const Text('Choose platform permissions'),
              ),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: status?.available == true && _selected.isNotEmpty
                    ? _previewImport
                    : null,
                icon: const Icon(Icons.preview_outlined),
                label: const Text('Preview selected data import'),
              ),
              if (_preview != null) ...[
                const SizedBox(height: 12),
                Text(
                  'Preview found ${_preview!.length} records. Nothing has been imported yet.',
                ),
                const SizedBox(height: 8),
                FilledButton.tonalIcon(
                  onPressed: _preview!.isEmpty || status == null
                      ? null
                      : () => _import(status),
                  icon: const Icon(Icons.download_done_outlined),
                  label: const Text('Import previewed records'),
                ),
              ],
              if (_result != null)
                Padding(
                  padding: const EdgeInsetsDirectional.only(top: 12),
                  child: Text(_result!),
                ),
              const SizedBox(height: 20),
              const Card(
                child: Padding(
                  padding: EdgeInsets.all(16),
                  child: Text(
                    'Every imported record carries source provenance and duplicate checks. The Sreadya vault remains authoritative; platform data never silently overwrites local history.',
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
