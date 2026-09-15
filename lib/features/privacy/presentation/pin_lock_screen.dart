import 'package:flutter/material.dart';

import '../data/pin_lock_service.dart';

class PinLockScreen extends StatefulWidget {
  const PinLockScreen({super.key});

  @override
  State<PinLockScreen> createState() => _PinLockScreenState();
}

class _PinLockScreenState extends State<PinLockScreen> {
  final _pin = TextEditingController();
  final _confirm = TextEditingController();
  final _service = PinLockService();
  late Future<bool> _configured = _service.isConfigured();
  bool _busy = false;

  @override
  void dispose() {
    _pin.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_pin.text != _confirm.text || !PinLockService.isValidPin(_pin.text)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Use matching 6–10 digit PINs.')),
      );
      return;
    }
    setState(() => _busy = true);
    try {
      await _service.setPin(_pin.text);
      _pin.clear();
      _confirm.clear();
      if (mounted) {
        setState(() => _configured = Future.value(true));
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Sreva PIN verifier saved in secure device storage.'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _remove() async {
    await _service.clear();
    if (mounted) setState(() => _configured = Future.value(false));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Sreva PIN fallback')),
      body: FutureBuilder<bool>(
        future: _configured,
        builder: (context, snapshot) {
          final configured = snapshot.data == true;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              const Card(
                child: Padding(
                  padding: EdgeInsets.all(16),
                  child: Text(
                    'A Sreva PIN is optional. It is stored only as a memory-hard Argon2id verifier in OS secure storage. It never encrypts the health database and is never sent to a server.',
                  ),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _pin,
                obscureText: true,
                keyboardType: TextInputType.number,
                maxLength: 10,
                decoration: InputDecoration(
                  labelText: configured ? 'New PIN' : 'PIN',
                  helperText: '6–10 digits',
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _confirm,
                obscureText: true,
                keyboardType: TextInputType.number,
                maxLength: 10,
                decoration: const InputDecoration(labelText: 'Confirm PIN'),
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: _busy ? null : _save,
                icon: const Icon(Icons.pin_outlined),
                label: Text(
                  configured ? 'Change Sreva PIN' : 'Enable Sreva PIN',
                ),
              ),
              if (configured) ...[
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: _busy ? null : _remove,
                  icon: const Icon(Icons.delete_outline),
                  label: const Text('Remove Sreva PIN'),
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}
