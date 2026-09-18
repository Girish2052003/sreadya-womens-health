import 'package:flutter_test/flutter_test.dart';
import 'package:sqlite3/sqlite3.dart';
import 'package:sreadya/core/database/migration_coordinator.dart';

Database databaseAtVersion(int version) {
  final db = sqlite3.openInMemory();
  db.execute(
    'CREATE TABLE metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL);',
  );
  db.execute("INSERT INTO metadata VALUES('schema_version', ?);", [
    version.toString(),
  ]);
  return db;
}

void main() {
  test('adjacent migration 1 to 2 runs exactly the 1 to 2 step', () {
    final db = databaseAtVersion(1);
    addTearDown(db.close);
    final coordinator = MigrationCoordinator(
      targetVersion: 2,
      steps: {
        1: (database) => database.execute(
          'CREATE TABLE adjacent_one(id INTEGER PRIMARY KEY);',
        ),
      },
    );

    coordinator.migrate(db);

    expect(coordinator.readSchemaVersion(db), 2);
    expect(
      db.select("SELECT name FROM sqlite_master WHERE name='adjacent_one';"),
      isNotEmpty,
    );
  });

  test('adjacent migration 2 to 3 does not replay the 1 to 2 step', () {
    final db = databaseAtVersion(2);
    addTearDown(db.close);
    final coordinator = MigrationCoordinator(
      targetVersion: 3,
      steps: {
        1: (_) => throw StateError('old step must not replay'),
        2: (database) => database.execute(
          'CREATE TABLE adjacent_two(id INTEGER PRIMARY KEY);',
        ),
      },
    );

    coordinator.migrate(db);

    expect(coordinator.readSchemaVersion(db), 3);
    expect(
      db.select("SELECT name FROM sqlite_master WHERE name='adjacent_two';"),
      isNotEmpty,
    );
  });

  test('skipped-version upgrade 1 to 3 runs every required step', () {
    final db = databaseAtVersion(1);
    addTearDown(db.close);

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
    final db = databaseAtVersion(1);
    addTearDown(db.close);

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
