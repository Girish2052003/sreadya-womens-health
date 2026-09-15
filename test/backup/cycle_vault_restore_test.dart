import 'package:flutter_test/flutter_test.dart';
import 'package:sreva/features/backup/domain/restore_transaction.dart';
import 'package:sreva/features/cycle/domain/cycle_models.dart';

void main() {
  test('failed staged restore never replaces the live repository', () async {
    final live = _MemoryStore(periodIds: ['live']);
    final staged = _MemoryStore(periodIds: ['restored'], valid: false);
    final coordinator = RestoreTransactionCoordinator<_MemoryStore>();

    await expectLater(
      coordinator.commit(
        live: live,
        staged: staged,
        validate: (store) async => store.valid,
        replaceLive: (store) async => live.replacedWith = store,
      ),
      throwsStateError,
    );

    expect(live.replacedWith, isNull);
    expect(live.periodIds, ['live']);
  });

  test(
    'valid staged restore is the only state passed to atomic replacement',
    () async {
      final live = _MemoryStore(periodIds: ['live']);
      final staged = _MemoryStore(periodIds: ['restored']);
      final coordinator = RestoreTransactionCoordinator<_MemoryStore>();

      await coordinator.commit(
        live: live,
        staged: staged,
        validate: (store) async => store.valid,
        replaceLive: (store) async => live.replacedWith = store,
      );

      expect(live.replacedWith, same(staged));
    },
  );
}

class _MemoryStore {
  _MemoryStore({required this.periodIds, this.valid = true});
  final List<String> periodIds;
  final bool valid;
  _MemoryStore? replacedWith;
}
