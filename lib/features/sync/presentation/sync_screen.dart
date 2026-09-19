import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../account/data/mobile_continuity_service.dart';
import '../data/mobile_sync_control_store.dart';

class SyncScreen extends StatefulWidget {
  const SyncScreen({super.key});

  @override
  State<SyncScreen> createState() => _SyncScreenState();
}

class _SyncScreenState extends State<SyncScreen> {
  final _store = MobileSyncControlStore();
  final _accountStore = MobileAccountStateStore();

  MobileSyncControlState _state = const MobileSyncControlState();
  String? _accountId;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  Future<void> _reload() async {
    final state = await _store.read();
    final accountId = await _accountStore.readAccountId();
    if (!mounted) return;
    setState(() {
      _state = state;
      _accountId = accountId;
      _loading = false;
    });
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() => _loading = true);
    await action();
    await _reload();
  }

  String get _mode {
    if (_state.disabled) return 'Disabled';
    if (_state.paused) return 'Paused';
    return 'Available when continuity is configured';
  }

  @override
  Widget build(BuildContext context) {
    final endpoint = MobileContinuityConfig.endpoint;
    return Scaffold(
      appBar: AppBar(title: const Text('Encrypted continuity')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Sync status',
                    style: Theme.of(context).textTheme.titleLarge
                        ?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    endpoint == null
                        ? 'Service endpoint: not configured for this build'
                        : 'Service endpoint: securely configured',
                  ),
                  Text(
                    _accountId == null
                        ? 'Account: account-free local mode'
                        : 'Account: continuity identity linked',
                  ),
                  Text('Continuity preference: $_mode'),
                  Text(
                    _state.lastSuccessfulSync == null
                        ? 'Last successful sync: none on this device'
                        : 'Last successful sync: ${_state.lastSuccessfulSync}',
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Sreadya encrypts health content on the client before optional synchronization. Account-free local health use remains complete while sync is unavailable, paused or disabled.',
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Continuity controls',
                    style: Theme.of(context).textTheme.titleLarge
                        ?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  FilledButton.tonal(
                    onPressed: _loading ? null : () => _run(_store.pause),
                    child: const Text('Pause sync'),
                  ),
                  const SizedBox(height: 8),
                  FilledButton.tonal(
                    onPressed: _loading ? null : () => _run(_store.resume),
                    child: const Text('Resume sync'),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton(
                    onPressed: _loading ? null : () => _run(_store.disable),
                    child: const Text('Disable sync'),
                  ),
                  if (_accountId == null) ...[
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: () => context.push('/more/account'),
                      child: const Text('Open Account & continuity'),
                    ),
                  ],
                  const SizedBox(height: 12),
                  const Text(
                    'Remote upload/download is never simulated. It becomes operational only when a reviewed Sreadya continuity service, authenticated account, trusted-device authorization and encrypted transport are configured for the release.',
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
