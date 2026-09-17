import 'package:flutter/foundation.dart';

import '../data/account_continuity_adapter.dart';
import '../domain/account_continuity.dart';

class AccountContinuityController extends ChangeNotifier {
  AccountContinuityController(this._adapter);

  final MobileAccountContinuityAdapter _adapter;
  AccountContinuitySnapshot _snapshot = const AccountContinuitySnapshot();

  AccountContinuitySnapshot get snapshot => _snapshot;

  Future<void> registerPasskey(String accountId) async {
    _set(
      const AccountContinuitySnapshot(status: AccountContinuityStatus.working),
    );
    try {
      await _adapter.registerPasskey(accountId);
      _set(
        AccountContinuitySnapshot(
          status: AccountContinuityStatus.authenticated,
          accountId: accountId,
        ),
      );
    } catch (error) {
      _set(
        AccountContinuitySnapshot(
          status: AccountContinuityStatus.failed,
          errorMessage: error.toString(),
        ),
      );
      rethrow;
    }
  }

  Future<String> loginWithPasskey() async {
    _set(
      const AccountContinuitySnapshot(status: AccountContinuityStatus.working),
    );
    try {
      final accountId = await _adapter.loginWithPasskey();
      _set(
        AccountContinuitySnapshot(
          status: AccountContinuityStatus.authenticated,
          accountId: accountId,
        ),
      );
      return accountId;
    } catch (error) {
      _set(
        AccountContinuitySnapshot(
          status: AccountContinuityStatus.failed,
          errorMessage: error.toString(),
        ),
      );
      rethrow;
    }
  }

  void clearSessionView() => _set(const AccountContinuitySnapshot());

  void _set(AccountContinuitySnapshot value) {
    _snapshot = value;
    notifyListeners();
  }
}
