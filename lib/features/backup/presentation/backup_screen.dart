import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

import '../../../app/providers.dart';
import '../data/cycle_vault_service.dart';

class BackupScreen extends ConsumerStatefulWidget {
  const BackupScreen({super.key});

  @override
  ConsumerState<BackupScreen> createState() => _BackupScreenState();
}

class _BackupScreenState extends ConsumerState<BackupScreen> {
  final _passphrase = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _passphrase.dispose();
    super.dispose();
  }

  Future<void> _export() async {
    if (_passphrase.text.length < 12) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Use a recovery passphrase with at least 12 characters.',
          ),
        ),
      );
      return;
    }
    setState(() => _busy = true);
    try {
      final service = await ref.read(cycleVaultServiceProvider.future);
      final path = await service.exportToFile(_passphrase.text);
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(path)],
          text: 'Encrypted Sreva CycleVault backup. Keep the recovery passphrase separately.',
        ),
      );
    } catch (error) {
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Backup failed: $error')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _restore() async {
    if (_passphrase.text.length < 12) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter the recovery passphrase first.')),
      );
      return;
    }
    final file = await FilePicker.pickFile(
      type: FileType.custom,
      allowedExtensions: ['cyclevault'],
    );
    if (file?.path == null || !mounted) return;

    final mode = await showDialog<CycleVaultRestoreMode>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Restore CycleVault'),
        content: const Text(
          'Replace all local Sreva health data with the validated backup, or merge only records that are not already present? Replacement is atomic and only happens after validation.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () =>
                Navigator.pop(context, CycleVaultRestoreMode.merge),
            child: const Text('Merge'),
          ),
          FilledButton(
            onPressed: () =>
                Navigator.pop(context, CycleVaultRestoreMode.replaceAll),
            child: const Text('Replace from backup'),
          ),
        ],
      ),
    );
    if (mode == null) return;

    setState(() => _busy = true);
    try {
      final service = await ref.read(cycleVaultServiceProvider.future);
      final result = await service.restoreFromFile(
        file!.path!,
        _passphrase.text,
        mode: mode,
      );
      ref.read(healthActionsProvider).refreshAll();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              result.mode == CycleVaultRestoreMode.replaceAll
                  ? 'Validated backup restored atomically: ${result.periods} periods and ${result.observations} observations.'
                  : 'Merged ${result.periods} periods and ${result.observations} observations without deleting local records.',
            ),
          ),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Restore failed: $error')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('CycleVault')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'CycleVault encrypts a portable backup on this device using Argon2id + AES-256-GCM. Sreva never sends the passphrase or backup to our servers.',
              ),
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _passphrase,
            obscureText: true,
            enableSuggestions: false,
            autocorrect: false,
            decoration: const InputDecoration(
              labelText: 'Recovery passphrase',
              helperText:
                  'At least 12 characters; store it somewhere separate.',
            ),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: _busy ? null : _export,
            icon: const Icon(Icons.backup_outlined),
            label: const Text('Create encrypted backup'),
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: _busy ? null : _restore,
            icon: const Icon(Icons.restore),
            label: const Text('Restore CycleVault'),
          ),
          const SizedBox(height: 16),
          const Text(
            'If the passphrase is lost, Sreva cannot recover the CycleVault. This is intentional: the developer does not hold a recovery copy of your health data or encryption key.',
          ),
        ],
      ),
    );
  }
}
