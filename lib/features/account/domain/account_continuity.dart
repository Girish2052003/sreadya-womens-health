class PasskeyCeremony {
  const PasskeyCeremony({
    required this.sessionId,
    required this.publicKeyOptions,
  });

  final String sessionId;
  final Map<String, Object?> publicKeyOptions;
}

abstract interface class AccountIdentityTransport {
  Future<PasskeyCeremony> beginPasskeyRegistration(String accountId);

  Future<void> finishPasskeyRegistration({
    required String sessionId,
    required Map<String, Object?> credential,
  });

  Future<PasskeyCeremony> beginPasskeyLogin();

  Future<String> finishPasskeyLogin({
    required String sessionId,
    required Map<String, Object?> credential,
  });
}

enum AccountContinuityStatus { idle, working, authenticated, failed }

class AccountContinuitySnapshot {
  const AccountContinuitySnapshot({
    this.status = AccountContinuityStatus.idle,
    this.accountId,
    this.errorMessage,
  });

  final AccountContinuityStatus status;
  final String? accountId;
  final String? errorMessage;
}
