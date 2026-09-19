import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../data/mobile_continuity_service.dart';

class DevicesScreen extends StatefulWidget {
  const DevicesScreen({super.key});

  @override
  State<DevicesScreen> createState() => _DevicesScreenState();
}

class _DevicesScreenState extends State<DevicesScreen> {
  final _stateStore = MobileAccountStateStore();
  final _qrController = TextEditingController();

  MobileContinuityService? _service;
  String? _accountId;
  List<MobileIdentityDevice> _devices = const [];
  String _qrStatus = '';
  String? _error;
  bool _working = false;

  @override
  void initState() {
    super.initState();
    final endpoint = MobileContinuityConfig.endpoint;
    if (endpoint != null) {
      _service = MobileContinuityService(endpoint: endpoint);
    }
    _load();
  }

  Future<void> _load() async {
    final accountId = await _stateStore.readAccountId();
    if (!mounted) return;
    setState(() => _accountId = accountId);
    if (accountId != null) await _refresh();
  }

  Future<void> _refresh() async {
    final service = _service;
    final accountId = _accountId;
    if (service == null || accountId == null || _working) return;
    setState(() {
      _working = true;
      _error = null;
    });
    try {
      final devices = await service.listDevices(accountId);
      if (mounted) setState(() => _devices = devices);
    } catch (error) {
      if (mounted) {
        setState(() => _error = 'Unable to refresh trusted devices: $error');
      }
    } finally {
      if (mounted) setState(() => _working = false);
    }
  }

  void _validateQr() {
    setState(() {
      _error = null;
      _qrStatus = '';
    });
    Uint8List? secret;
    try {
      final parts = _qrController.text.trim().split(':');
      if (parts.length != 3 ||
          parts[0] != 'SREADYA-TRANSFER-1' ||
          parts[1].trim().isEmpty) {
        throw const FormatException('Invalid trusted-device QR payload.');
      }
      final encoded = parts[2].trim();
      if (!RegExp(r'^[A-Za-z0-9_-]+$').hasMatch(encoded)) {
        throw const FormatException('Invalid trusted-device QR encoding.');
      }
      secret = Uint8List.fromList(
        base64Url.decode(base64Url.normalize(encoded)),
      );
      if (secret.length != 32) {
        throw const FormatException(
          'Trusted-device transfer secret is invalid.',
        );
      }
      setState(
        () => _qrStatus =
            'Enrollment request ${parts[1]} is structurally valid. The transfer secret stayed in memory only.',
      );
    } catch (error) {
      setState(
        () => _error = 'Trusted-device QR could not be validated: $error',
      );
    } finally {
      if (secret != null) secret.fillRange(0, secret.length, 0);
    }
  }

  @override
  void dispose() {
    _qrController.dispose();
    _service?.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final configured = MobileContinuityConfig.configured;
    return Scaffold(
      appBar: AppBar(title: const Text('Trusted devices')),
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
                    'Device access',
                    style: Theme.of(context).textTheme.titleLarge
                        ?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Trusted-device state belongs to optional encrypted continuity. Local cycle tracking remains complete even when continuity is disabled.',
                  ),
                  const SizedBox(height: 12),
                  Text(
                    configured
                        ? 'Continuity service: configured'
                        : 'Continuity service: not configured for this build',
                  ),
                  if (_accountId == null) ...[
                    const SizedBox(height: 8),
                    const Text(
                      'No continuity account is linked on this device.',
                    ),
                    TextButton(
                      onPressed: () => context.push('/more/account'),
                      child: const Text('Open Account & continuity'),
                    ),
                  ] else ...[
                    const SizedBox(height: 8),
                    FilledButton.tonalIcon(
                      onPressed: configured && !_working ? _refresh : null,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Refresh trusted devices'),
                    ),
                    const SizedBox(height: 8),
                    if (_devices.isEmpty)
                      const Text('No trusted devices returned yet.')
                    else
                      ..._devices.map(
                        (device) => ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: const Icon(Icons.devices_outlined),
                          title: Text(device.deviceId),
                          subtitle: Text(device.state),
                        ),
                      ),
                  ],
                  if (_error != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      _error!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ],
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
                    'Approve a new-device request safely',
                    style: Theme.of(context).textTheme.titleLarge
                        ?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Paste the Sreadya trusted-device QR payload to validate its enrollment identifier and 256-bit transfer secret locally before any network approval is attempted.',
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _qrController,
                    minLines: 3,
                    maxLines: 6,
                    autocorrect: false,
                    enableSuggestions: false,
                    decoration: const InputDecoration(
                      labelText: 'Trusted-device QR payload',
                    ),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: _validateQr,
                    child: const Text('Validate locally'),
                  ),
                  if (_qrStatus.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(_qrStatus),
                  ],
                  const SizedBox(height: 8),
                  const Text(
                    'Network approval/revocation is performed only through the reviewed signed-device continuity protocol when a compatible service is configured. Sreadya never treats a pasted QR as automatic consent.',
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
