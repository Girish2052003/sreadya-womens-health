import 'dart:convert';
import 'dart:io';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../domain/account_continuity.dart';

class MobileContinuityConfig {
  const MobileContinuityConfig._();

  static const String _rawBaseUrl = String.fromEnvironment(
    'SREADYA_SYNC_BASE_URL',
    defaultValue: '',
  );

  static Uri? get endpoint {
    final value = _rawBaseUrl.trim();
    if (value.isEmpty) return null;
    final uri = Uri.tryParse(value);
    if (uri == null || !uri.hasScheme || uri.host.isEmpty) return null;
    if (uri.scheme != 'https' &&
        !(uri.scheme == 'http' &&
            (uri.host == 'localhost' || uri.host == '127.0.0.1'))) {
      return null;
    }
    return Uri.parse(
      value.endsWith('/') ? value.substring(0, value.length - 1) : value,
    );
  }

  static bool get configured => endpoint != null;
}

class MobileAccountStateStore {
  MobileAccountStateStore({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  static const _accountKey = 'sreadya.account-id.v1';
  final FlutterSecureStorage _storage;

  Future<String?> readAccountId() async {
    final value = (await _storage.read(key: _accountKey))?.trim();
    return value == null || value.isEmpty ? null : value;
  }

  Future<void> writeAccountId(String value) =>
      _storage.write(key: _accountKey, value: value.trim());

  Future<void> clearAccountId() => _storage.delete(key: _accountKey);
}

class MobileIdentityDevice {
  const MobileIdentityDevice({
    required this.deviceId,
    required this.accountId,
    required this.state,
  });

  final String deviceId;
  final String accountId;
  final String state;

  factory MobileIdentityDevice.fromJson(Map<String, Object?> json) {
    String requiredText(String key) {
      final value = json[key];
      if (value is! String || value.trim().isEmpty) {
        throw FormatException('Invalid Sreadya device field: $key');
      }
      return value;
    }

    return MobileIdentityDevice(
      deviceId: requiredText('device_id'),
      accountId: requiredText('account_id'),
      state: requiredText('state'),
    );
  }
}

class MobileContinuityService implements AccountIdentityTransport {
  MobileContinuityService({required Uri endpoint, HttpClient? client})
    : _endpoint = endpoint,
      _client = client ?? HttpClient();

  final Uri _endpoint;
  final HttpClient _client;

  Uri _uri(String path) => _endpoint.resolve(path);

  Future<Object?> _request(
    String method,
    String path, {
    Object? body,
    Map<String, String> headers = const {},
  }) async {
    final request = await _client.openUrl(method, _uri(path));
    request.followRedirects = false;
    request.headers.set(HttpHeaders.acceptHeader, 'application/json');
    for (final entry in headers.entries) {
      request.headers.set(entry.key, entry.value);
    }
    if (body != null) {
      request.headers.contentType = ContentType.json;
      request.add(utf8.encode(jsonEncode(body)));
    }

    final response = await request.close();
    final responseBody = await utf8.decoder.bind(response).join();
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw HttpException(
        'Sreadya continuity request failed with HTTP ${response.statusCode}.',
        uri: _uri(path),
      );
    }
    if (responseBody.trim().isEmpty) return null;
    return jsonDecode(responseBody);
  }

  Map<String, Object?> _object(Object? value, String label) {
    if (value is! Map) {
      throw FormatException('Invalid Sreadya $label response.');
    }
    return value.map((key, item) => MapEntry(key.toString(), item as Object?));
  }

  Future<void> createIdentity({
    required String accountId,
    String? email,
    String? phone,
  }) async {
    final cleanAccountId = accountId.trim();
    final cleanEmail = email?.trim() ?? '';
    final cleanPhone = phone?.trim() ?? '';
    if (cleanAccountId.isEmpty || (cleanEmail.isEmpty && cleanPhone.isEmpty)) {
      throw const FormatException(
        'Sreadya identity requires an account id and email or mobile number.',
      );
    }
    await _request(
      'POST',
      '/v1/accounts/identity',
      body: <String, Object?>{
        'account_id': cleanAccountId,
        if (cleanEmail.isNotEmpty) 'email': cleanEmail,
        if (cleanPhone.isNotEmpty) 'phone': cleanPhone,
      },
    );
  }

  Future<List<MobileIdentityDevice>> listDevices(String accountId) async {
    final cleanAccountId = accountId.trim();
    if (cleanAccountId.isEmpty) return const [];
    final value = await _request(
      'GET',
      '/v1/accounts/${Uri.encodeComponent(cleanAccountId)}/devices',
    );
    if (value is! List) {
      throw const FormatException('Invalid Sreadya device-list response.');
    }
    return value
        .map(
          (item) =>
              MobileIdentityDevice.fromJson(_object(item, 'device-list item')),
        )
        .toList(growable: false);
  }

  @override
  Future<PasskeyCeremony> beginPasskeyRegistration(String accountId) async {
    final value = _object(
      await _request(
        'POST',
        '/v1/auth/passkeys/register/begin',
        body: {'account_id': accountId},
      ),
      'passkey registration',
    );
    final sessionId = value['session_id'];
    final publicKey = value['public_key'];
    if (sessionId is! String || sessionId.isEmpty) {
      throw const FormatException('Missing Sreadya passkey session.');
    }
    return PasskeyCeremony(
      sessionId: sessionId,
      publicKeyOptions: _object(publicKey, 'passkey options'),
    );
  }

  @override
  Future<void> finishPasskeyRegistration({
    required String sessionId,
    required Map<String, Object?> credential,
  }) async {
    await _request(
      'POST',
      '/v1/auth/passkeys/register/finish',
      body: credential,
      headers: {'X-Sreadya-Passkey-Session': sessionId},
    );
  }

  @override
  Future<PasskeyCeremony> beginPasskeyLogin() async {
    final value = _object(
      await _request('POST', '/v1/auth/passkeys/login/begin'),
      'passkey login',
    );
    final sessionId = value['session_id'];
    final publicKey = value['public_key'];
    if (sessionId is! String || sessionId.isEmpty) {
      throw const FormatException('Missing Sreadya passkey session.');
    }
    return PasskeyCeremony(
      sessionId: sessionId,
      publicKeyOptions: _object(publicKey, 'passkey options'),
    );
  }

  @override
  Future<String> finishPasskeyLogin({
    required String sessionId,
    required Map<String, Object?> credential,
  }) async {
    final value = _object(
      await _request(
        'POST',
        '/v1/auth/passkeys/login/finish',
        body: credential,
        headers: {'X-Sreadya-Passkey-Session': sessionId},
      ),
      'passkey login',
    );
    final accountId = value['account_id'];
    if (accountId is! String || accountId.trim().isEmpty) {
      throw const FormatException('Missing Sreadya account id.');
    }
    return accountId;
  }

  void close() => _client.close(force: true);
}
