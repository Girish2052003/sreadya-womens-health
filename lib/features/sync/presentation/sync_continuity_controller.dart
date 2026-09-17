import 'package:flutter/foundation.dart';

abstract interface class SyncSessionPort {
  Future<void> syncNow();
}

enum SyncContinuityStatus { disabled, idle, syncing, failed }

class SyncContinuitySnapshot {
  const SyncContinuitySnapshot({
    this.status = SyncContinuityStatus.disabled,
    this.lastSuccessfulSync,
    this.errorMessage,
  });

  final SyncContinuityStatus status;
  final DateTime? lastSuccessfulSync;
  final String? errorMessage;
}

class SyncContinuityController extends ChangeNotifier {
  SyncContinuityController(this._session);

  final SyncSessionPort _session;
  SyncContinuitySnapshot _snapshot = const SyncContinuitySnapshot();

  SyncContinuitySnapshot get snapshot => _snapshot;

  void setEnabled(bool enabled) {
    _set(
      SyncContinuitySnapshot(
        status: enabled ? SyncContinuityStatus.idle : SyncContinuityStatus.disabled,
        lastSuccessfulSync: _snapshot.lastSuccessfulSync,
      ),
    );
  }

  Future<void> syncNow() async {
    if (_snapshot.status == SyncContinuityStatus.disabled) return;
    _set(
      SyncContinuitySnapshot(
        status: SyncContinuityStatus.syncing,
        lastSuccessfulSync: _snapshot.lastSuccessfulSync,
      ),
    );
    try {
      await _session.syncNow();
      _set(
        SyncContinuitySnapshot(
          status: SyncContinuityStatus.idle,
          lastSuccessfulSync: DateTime.now().toUtc(),
        ),
      );
    } catch (error) {
      _set(
        SyncContinuitySnapshot(
          status: SyncContinuityStatus.failed,
          lastSuccessfulSync: _snapshot.lastSuccessfulSync,
          errorMessage: error.toString(),
        ),
      );
      rethrow;
    }
  }

  void _set(SyncContinuitySnapshot value) {
    _snapshot = value;
    notifyListeners();
  }
}
