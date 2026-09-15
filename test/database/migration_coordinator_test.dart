import 'package:flutter_test/flutter_test.dart';
import 'package:sqlite3/sqlite3.dart';
import 'package:sreva/core/database/migration_coordinator.dart';

void main() {
  test('migrates an old schema through every required version', () {
    final db = sqlite3.openInMemory();
    addTearDown(db.dispose);
    db.execute(
      'CREATE TABLE metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL);',
    );
    db.execute("INSERT INTO metadata VALUES('schema_version', '1');");

    final coordinator = MigrationCoordinator(
      targetVersion: 3,
      steps: {
        1: (database) =>
            database.execute('CREATE TABLE one(id INTEGER PRIMARY KEY);'),
        2: (database) =>
            database.execute('CREATE TABLE two(id INTEGER PRIMARY KEY);'),
      },
    );

    coordinator.migrate(db);

    expect(coordinator.readSchemaVersion(db), 3);
    expect(
      db.select("SELECT name FROM sqlite_master WHERE name='one';"),
      isNotEmpty,
    );
    expect(
      db.select("SELECT name FROM sqlite_master WHERE name='two';"),
      isNotEmpty,
    );
  });

  test('rolls back schema and data when a migration fails', () {
    final db = sqlite3.openInMemory();
    addTearDown(db.dispose);
    db.execute(
      'CREATE TABLE metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL);',
    );
    db.execute("INSERT INTO metadata VALUES('schema_version', '1');");

    final coordinator = MigrationCoordinator(
      targetVersion: 3,
      steps: {
        1: (database) => database.execute(
          'CREATE TABLE should_rollback(id INTEGER PRIMARY KEY);',
        ),
        2: (database) => throw StateError('synthetic migration failure'),
      },
    );

    expect(() => coordinator.migrate(db), throwsStateError);
    expect(coordinator.readSchemaVersion(db), 1);
    expect(
      db.select("SELECT name FROM sqlite_master WHERE name='should_rollback';"),
      isEmpty,
    );
  });
}
