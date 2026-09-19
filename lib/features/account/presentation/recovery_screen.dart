import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../../../core/crypto/e2ee/e2ee_v1.dart';

class RecoveryScreen extends StatefulWidget {
  const RecoveryScreen({super.key});

  @override
  State<RecoveryScreen> createState() => _RecoveryScreenState();
}

class _RecoveryScreenState extends State<RecoveryScreen> {
  final _secretController = TextEditingController();
  final _packageController = TextEditingController();

  String _status = '';
  String? _error;
  bool _working = false;

  Uint8List _decodeHexSecret(String value) {
    final clean = value.trim();
    if (!RegExp(r'^[0-9a-fA-F]{64}$').hasMatch(clean)) {
      throw const FormatException(
        'Recovery key must be exactly 32 bytes encoded as 64 hexadecimal characters.',
      );
    }
    return Uint8List.fromList([
      for (var index = 0; index < clean.length; index += 2)
        int.parse(clean.substring(index, index + 2), radix: 16),
    ]);
  }

  Map<String, Object?> _object(Object? value) {
    if (value is! Map) {
      throw const FormatException('Recovery package must be a JSON object.');
    }
    return value.map((key, item) => MapEntry(key.toString(), item as Object?));
  }

  String _requiredText(Map<String, Object?> json, String key) {
    final value = json[key];
    if (value is! String || value.trim().isEmpty) {
      throw FormatException('Recovery package field $key is missing.');
    }
    return value;
  }

  int _requiredInt(Map<String, Object?> json, String key) {
    final value = json[key];
    if (value is! int || value < 0) {
      throw FormatException('Recovery package field $key is invalid.');
    }
    return value;
  }

  Uint8List _decodeBase64(Map<String, Object?> json, String key) {
    try {
      return Uint8List.fromList(base64.decode(_requiredText(json, key)));
    } on FormatException {
      throw FormatException('Recovery package field $key is not valid base64.');
    }
  }

  Future<void> _verify() async {
    if (_working) return;
    setState(() {
      _working = true;
      _status = '';
      _error = null;
    });

    Uint8List? recoverySecret;
    Uint8List? key;
    Uint8List? rootSecret;
    try {
      final secret = _decodeHexSecret(_secretController.text);
      recoverySecret = secret;
      final json = _object(jsonDecode(_packageController.text));
      final protocolVersion = _requiredInt(json, 'protocol_version');
      final suiteId = _requiredText(json, 'suite_id');
      if (protocolVersion != 1 || suiteId != sreadyaE2eeSuiteV1) {
        throw const FormatException('Unsupported Sreadya recovery suite.');
      }

      final context = RecoveryEnvelopeContext(
        accountId: _requiredText(json, 'account_id'),
        vaultId: _requiredText(json, 'vault_id'),
        keyEpoch: _requiredInt(json, 'key_epoch'),
        suiteId: suiteId,
      );
      final salt = _decodeBase64(json, 'kdf_salt');
      final nonce = _decodeBase64(json, 'nonce');
      final ciphertext = _decodeBase64(json, 'ciphertext_and_tag');
      if (salt.length != 32 || nonce.length != 12 || ciphertext.length < 16) {
        throw const FormatException(
          'Recovery package cryptographic sizes are invalid.',
        );
      }

      final crypto = E2eeV1Crypto();
      key = await crypto.deriveRecoveryWrappingKey(secret, salt, context);
      rootSecret = await crypto.open(
        key: key,
        nonce: nonce,
        aad: recoveryEnvelopeAad(context),
        ciphertextAndTag: ciphertext,
      );
      if (rootSecret.length != 32) {
        throw const FormatException('Recovered vault secret is invalid.');
      }

      if (!mounted) return;
      setState(
        () => _status = 'Recovery package verified locally. The recovered vault secret was not displayed, logged or uploaded.',
      );
    } catch (error) {
      if (mounted) {
        setState(() => _error = 'Recovery verification failed: $error');
      }
    } finally {
      if (recoverySecret != null) {
        recoverySecret.fillRange(0, recoverySecret.length, 0);
      }
      if (key != null) key.fillRange(0, key.length, 0);
      if (rootSecret != null) {
        rootSecret.fillRange(0, rootSecret.length, 0);
      }
      if (mounted) setState(() => _working = false);
    }
  }

  @override
  void dispose() {
    _secretController.dispose();
    _packageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Recovery')),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Card(
          child: Padding(
            padding: EdgeInsets.all(16),
            child: Text(
              'Account identity recovery and health-vault recovery are deliberately separate. Email or SMS may help recover identity, but they cannot decrypt an old health vault by themselves.',
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
                  'Verify an emergency recovery package',
                  style: Theme.of(context).textTheme.titleLarge
                      ?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Verification happens entirely on this device. A successful check proves that the recovery key can unwrap the encrypted vault-root secret; the secret is immediately cleared from temporary memory afterwards.',
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _secretController,
                  enabled: !_working,
                  obscureText: true,
                  autocorrect: false,
                  enableSuggestions: false,
                  decoration: const InputDecoration(
                    labelText: 'Recovery key (64 hexadecimal characters)',
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _packageController,
                  enabled: !_working,
                  minLines: 6,
                  maxLines: 12,
                  autocorrect: false,
                  enableSuggestions: false,
                  decoration: const InputDecoration(
                    labelText: 'Recovery package JSON',
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _working ? null : _verify,
                  child: const Text('Verify locally'),
                ),
                if (_status.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(_status),
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
      ],
    ),
  );
}
