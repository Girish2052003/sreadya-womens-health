import 'package:sqlite3/sqlite3.dart';

typedef MigrationStep = void Function(Database database);

/// Runs every schema migration inside one SQLite transaction.
///
/// A failure leaves both schema and metadata at the version that existed
/// before migration began. Steps are keyed by their *from* version.
class MigrationCoordinator {
  const MigrationCoordinator({
    required this.targetVersion,
    required this.steps,
  });

  final int targetVersion;
  final Map<int, MigrationStep> steps;

  int readSchemaVersion(Database database) {
    final rows = database.select(
      "SELECT value FROM metadata WHERE key='schema_version' LIMIT 1;",
    );
    if (rows.isEmpty) return 0;
    return int.parse(rows.first['value'] as String);
  }

  void migrate(Database database) {
    final initialVersion = readSchemaVersion(database);
    if (initialVersion > targetVersion) {
      throw StateError(
        'Database schema $initialVersion is newer than supported $targetVersion.',
      );
    }
    if (initialVersion == targetVersion) return;

    database.execute('BEGIN IMMEDIATE;');
    try {
      var version = initialVersion;
      while (version < targetVersion) {
        final step = steps[version];
        if (step == null) {
          throw StateError('Missing migration step $version -> ${version + 1}.');
        }
        step(database);
        version += 1;
        database.execute(
          '''
          INSERT INTO metadata(key, value) VALUES('schema_version', ?)
          ON CONFLICT(key) DO UPDATE SET value=excluded.value;
          ''',
          [version.toString()],
        );
      }
      database.execute('COMMIT;');
    } catch (_) {
      database.execute('ROLLBACK;');
      rethrow;
    }
  }
}
