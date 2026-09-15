/// Coordinates the final commit of a staged restore.
///
/// Decryption/parsing happens before this point. The staged state must pass
/// every integrity/domain check before the caller is allowed to atomically
/// replace live storage.
class RestoreTransactionCoordinator<T> {
  const RestoreTransactionCoordinator();

  Future<void> commit({
    required T live,
    required T staged,
    required Future<bool> Function(T staged) validate,
    required Future<void> Function(T staged) replaceLive,
  }) async {
    final valid = await validate(staged);
    if (!valid) {
      throw StateError('Staged CycleVault restore failed validation.');
    }
    await replaceLive(staged);
  }
}
