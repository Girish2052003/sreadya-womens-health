import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

import '../../../app/providers.dart';
import '../data/diagnostic_service.dart';

class DiagnosticsScreen extends ConsumerStatefulWidget {
  const DiagnosticsScreen({super.key});

  @override
  ConsumerState<DiagnosticsScreen> createState() => _DiagnosticsScreenState();
}

class _DiagnosticsScreenState extends ConsumerState<DiagnosticsScreen> {
  String? _report;

  Future<void> _generate() async {
    final vault = await ref.read(healthVaultProvider.future);
    final report = await DiagnosticService(vault: vault, reminderScheduler: ref.read(reminderSchedulerProvider)).build();
    if (mounted) setState(() => _report = report);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Diagnostics')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Card(child: Padding(padding: EdgeInsets.all(16), child: Text('Diagnostics are deliberately operational only. Period dates, symptoms, fertility data, medication, pregnancy status, sexual activity and notes are excluded.'))),
          const SizedBox(height: 12),
          FilledButton.icon(onPressed: _generate, icon: const Icon(Icons.fact_check_outlined), label: const Text('Generate diagnostic report')),
          if (_report != null) ...[
            const SizedBox(height: 16),
            SelectableText(_report!, style: const TextStyle(fontFamily: 'monospace')),
            const SizedBox(height: 12),
            OutlinedButton.icon(onPressed: () => SharePlus.instance.share(ShareParams(text: _report!, title: 'Sreva diagnostic report')), icon: const Icon(Icons.ios_share), label: const Text('Share this report intentionally')),
          ],
        ],
      ),
    );
  }
}
