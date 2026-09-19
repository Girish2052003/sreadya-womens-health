import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';

import '../data/account_continuity_adapter.dart';
import '../data/mobile_continuity_service.dart';
import '../domain/account_continuity.dart';
import 'account_continuity_controller.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key});

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  static const _uuid = Uuid();

  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _stateStore = MobileAccountStateStore();

  MobileContinuityService? _service;
  MobileAccountContinuityAdapter? _adapter;
  AccountContinuityController? _continuity;
  String? _accountId;
  String _status = 'Account-free Sreadya is active.';
  String? _error;
  bool _passkeysAvailable = false;
  bool _working = false;

  Uri? get _endpoint => MobileContinuityConfig.endpoint;
  bool get _remoteReady => _endpoint != null && _service != null;

  @override
  void initState() {
    super.initState();
    final endpoint = _endpoint;
    if (endpoint != null) {
      final service = MobileContinuityService(endpoint: endpoint);
      final adapter = MobileAccountContinuityAdapter(
        identityTransport: service,
      );
      _service = service;
      _adapter = adapter;
      _continuity = AccountContinuityController(adapter);
    }
    _load();
  }

  Future<void> _load() async {
    final accountId = await _stateStore.readAccountId();
    final adapter = _adapter;
    final passkeys = adapter == null ? false : await adapter.passkeysAvailable;
    if (!mounted) return;
    setState(() {
      _accountId = accountId;
      _passkeysAvailable = passkeys;
      if (_endpoint == null) {
        _status =
            'Optional encrypted continuity is not configured for this build.';
      } else if (accountId != null) {
        _status = 'This device remembers your continuity identity.';
      } else {
        _status = 'Continuity is available, but no account is linked.';
      }
    });
  }

  Future<void> _run(Future<void> Function() action) async {
    if (_working) return;
    setState(() {
      _working = true;
      _error = null;
    });
    try {
      await action();
    } catch (error) {
      if (mounted) {
        setState(() => _error = 'Continuity action failed: $error');
      }
    } finally {
      if (mounted) setState(() => _working = false);
    }
  }

  Future<void> _createIdentity() => _run(() async {
    final service = _service;
    if (service == null) return;
    final email = _emailController.text.trim();
    final phone = _phoneController.text.trim();
    if (email.isEmpty && phone.isEmpty) {
      setState(() => _error = 'Enter an email address or mobile number.');
      return;
    }

    final accountId = _accountId ?? 'acct_${_uuid.v4()}';
    await service.createIdentity(
      accountId: accountId,
      email: email.isEmpty ? null : email,
      phone: phone.isEmpty ? null : phone,
    );
    await _stateStore.writeAccountId(accountId);
    if (!mounted) return;
    setState(() {
      _accountId = accountId;
      _status = 'Identity accepted. Add a passkey to protect sign-in.';
    });
  });

  Future<void> _addPasskey() => _run(() async {
    final accountId = _accountId;
    final continuity = _continuity;
    if (accountId == null || continuity == null) return;
    await continuity.registerPasskey(accountId);
    if (!mounted) return;
    setState(() => _status = 'Passkey registered on this device.');
  });

  Future<void> _signIn() => _run(() async {
    final continuity = _continuity;
    if (continuity == null) return;
    final accountId = await continuity.loginWithPasskey();
    await _stateStore.writeAccountId(accountId);
    if (!mounted) return;
    setState(() {
      _accountId = accountId;
      _status = 'Signed in with a passkey.';
    });
  });

  Future<void> _returnToPrivateMode() => _run(() async {
    await _stateStore.clearAccountId();
    _continuity?.clearSessionView();
    if (!mounted) return;
    setState(() {
      _accountId = null;
      _status = 'Account-free Sreadya is active.';
    });
  });

  @override
  void dispose() {
    _emailController.dispose();
    _phoneController.dispose();
    _continuity?.dispose();
    _service?.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final endpoint = _endpoint;
    return Scaffold(
      appBar: AppBar(title: const Text('Account & continuity')),
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
                    'Account-free stays complete',
                    style: Theme.of(context).textTheme.titleLarge
                        ?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Tracking, predictions, reminders, reports, backup and local privacy controls do not require an account. An account exists only for optional encrypted continuity across devices.',
                  ),
                  const SizedBox(height: 12),
                  Text(
                    endpoint == null
                        ? 'Continuity service: not configured for this build'
                        : 'Continuity service: securely configured',
                  ),
                  if (_accountId != null)
                    Text('Local account reference: ${_accountId!}'),
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
                    'Optional account',
                    style: Theme.of(context).textTheme.titleLarge
                        ?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _emailController,
                    enabled: _remoteReady && !_working,
                    keyboardType: TextInputType.emailAddress,
                    autofillHints: const [AutofillHints.email],
                    decoration: const InputDecoration(
                      labelText: 'Email (optional)',
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _phoneController,
                    enabled: _remoteReady && !_working,
                    keyboardType: TextInputType.phone,
                    autofillHints: const [AutofillHints.telephoneNumber],
                    decoration: const InputDecoration(
                      labelText: 'Mobile number (optional)',
                    ),
                  ),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: _remoteReady && !_working
                        ? _createIdentity
                        : null,
                    child: const Text('Create / link identity'),
                  ),
                  const SizedBox(height: 8),
                  FilledButton.tonal(
                    onPressed:
                        _remoteReady &&
                            !_working &&
                            _accountId != null &&
                            _passkeysAvailable
                        ? _addPasskey
                        : null,
                    child: const Text('Add passkey'),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton(
                    onPressed:
                        _remoteReady && !_working && _passkeysAvailable
                        ? _signIn
                        : null,
                    child: const Text('Sign in with passkey'),
                  ),
                  if (_accountId != null) ...[
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: _working ? null : _returnToPrivateMode,
                      child: const Text('Use this device account-free'),
                    ),
                  ],
                  const SizedBox(height: 12),
                  Text(_status),
                  if (!_passkeysAvailable && _remoteReady)
                    const Text(
                      'Passkeys are unavailable on this device or OS configuration.',
                    ),
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
        ],
      ),
    );
  }
}
