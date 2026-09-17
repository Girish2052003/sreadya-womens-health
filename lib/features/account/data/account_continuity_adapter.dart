import '../domain/account_continuity.dart';
import 'native_passkey_adapter.dart';

class MobileAccountContinuityAdapter {
  MobileAccountContinuityAdapter({
    required AccountIdentityTransport transport,
    NativePasskeyAdapter? passkeys,
  }) : _transport = transport,
       _passkeys = passkeys ?? NativePasskeyAdapter();

  final AccountIdentityTransport _transport;
  final NativePasskeyAdapter _passkeys;

  Future<bool> get passkeysAvailable => _passkeys.isAvailable();

  Future<void> registerPasskey(String accountId) async {
    if (accountId.trim().isEmpty) {
      throw ArgumentError.value(accountId, 'accountId', 'must not be empty');
    }
    final ceremony = await _transport.beginPasskeyRegistration(accountId);
    final credential = await _passkeys.createCredential(
      ceremony.publicKeyOptions,
    );
    await _transport.finishPasskeyRegistration(
      sessionId: ceremony.sessionId,
      credential: credential,
    );
  }

  Future<String> loginWithPasskey() async {
    final ceremony = await _transport.beginPasskeyLogin();
    final credential = await _passkeys.getCredential(ceremony.publicKeyOptions);
    final accountId = await _transport.finishPasskeyLogin(
      sessionId: ceremony.sessionId,
      credential: credential,
    );
    if (accountId.isEmpty) {
      throw const FormatException(
        'Passkey login returned an empty account id.',
      );
    }
    return accountId;
  }
}
