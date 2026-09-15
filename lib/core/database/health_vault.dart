import 'dart:io';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqlite3/sqlite3.dart';

import '../crypto/database_key_provider.dart';
import '../platform/privacy_platform.dart';
import '../version/app_versions.dart';
import 'migration_coordinator.dart';

class HealthVault {
  HealthVault._(this.database, this.path);

  final Database database;
  final String path;

  static Future<HealthVault> open({
    PrivacyPlatform? privacyPlatform,
    DatabaseKeyProvider? keyProvider,
  }) async {
    final root = await getApplicationSupportDirectory();
    await Directory(root.path).create(recursive: true);
    await (privacyPlatform ?? PrivacyPlatform()).excludePathFromBackup(root.path);
    final dbPath = p.join(root.path, 'sreva_vault.sqlite3');

    final provider = keyProvider ?? DatabaseKeyProvider();
    final rawKey = await provider.readOrCreate();
    final pragmaKey = provider.toSqlCipherRawKey(rawKey);

    final existed = await File(dbPath).exists() && await File(dbPath).length() > 0;
    var currentVersion = 0;
    if (existed) {
      final probe = sqlite3.open(dbPath);
      try {
        _applyKey(probe, pragmaKey);
        probe.select('SELECT count(*) FROM sqlite_master;');
        final hasMetadata = probe
            .select("SELECT name FROM sqlite_master WHERE type='table' AND name='metadata';")
            .isNotEmpty;
        if (hasMetadata) {
          final rows = probe.select("SELECT value FROM metadata WHERE key='schema_version' LIMIT 1;");
          if (rows.isNotEmpty) currentVersion = int.parse(rows.first['value'] as String);
        }
      } finally {
        probe.close();
      }
    }

    if (currentVersion > AppVersions.databaseSchema) {
      throw StateError(
        'Database schema $currentVersion is newer than supported ${AppVersions.databaseSchema}.',
      );
    }

    final needsMigration = currentVersion < AppVersions.databaseSchema;
    final snapshots = <String, String>{};
    if (existed && needsMigration) {
      for (final suffix in const ['', '-wal', '-shm']) {
        final source = File('$dbPath$suffix');
        if (!await source.exists()) continue;
        final snapshot = '$dbPath$suffix.pre_migration';
        await source.copy(snapshot);
        snapshots['$dbPath$suffix'] = snapshot;
      }
    }

    Database? db;
    try {
      db = sqlite3.open(dbPath);
      _applyKey(db, pragmaKey);
      db.select('SELECT count(*) FROM sqlite_master;');
      db.execute('PRAGMA cipher_memory_security = ON;');
      db.execute('PRAGMA journal_mode = WAL;');
      db.execute('PRAGMA foreign_keys = ON;');
      db.execute('''
        CREATE TABLE IF NOT EXISTS metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        ) STRICT;
      ''');

      final coordinator = MigrationCoordinator(
        targetVersion: AppVersions.databaseSchema,
        steps: {
          0: (database) {
            database.execute('''
              CREATE TABLE IF NOT EXISTS encrypted_records (
                id TEXT PRIMARY KEY,
                record_class TEXT NOT NULL,
                payload BLOB NOT NULL,
                updated_at TEXT NOT NULL
              ) STRICT;
            ''');
          },
        },
      );
      coordinator.migrate(db);

      final integrity = db.select('PRAGMA integrity_check;');
      if (integrity.isEmpty || integrity.first.values.first.toString().toLowerCase() != 'ok') {
        throw StateError('Health Vault integrity check failed after migration.');
      }

      for (final snapshot in snapshots.values) {
        final file = File(snapshot);
        if (await file.exists()) await file.delete();
      }
      return HealthVault._(db, dbPath);
    } catch (_) {
      db?.close();
      if (snapshots.isNotEmpty) {
        for (final entry in snapshots.entries) {
          final live = File(entry.key);
          if (await live.exists()) await live.delete();
          final backup = File(entry.value);
          if (await backup.exists()) await backup.copy(entry.key);
        }
        for (final snapshot in snapshots.values) {
          final file = File(snapshot);
          if (await file.exists()) await file.delete();
        }
      }
      rethrow;
    }
  }

  static void _applyKey(Database db, String pragmaKey) {
    db.execute('PRAGMA key = "$pragmaKey";');
    final cipher = db.select('PRAGMA cipher_version;');
    if (cipher.isEmpty || cipher.first.values.first.toString().trim().isEmpty) {
      throw StateError('Encrypted SQLite provider is unavailable.');
    }
  }

  int get schemaVersion {
    final result = database.select("SELECT value FROM metadata WHERE key='schema_version' LIMIT 1;");
    return result.isEmpty ? 0 : int.parse(result.first['value'] as String);
  }

  String integrityCheck() {
    final result = database.select('PRAGMA integrity_check;');
    return result.isEmpty ? 'unknown' : result.first.values.first.toString();
  }

  String cipherVersion() {
    final result = database.select('PRAGMA cipher_version;');
    return result.isEmpty ? 'unavailable' : result.first.values.first.toString();
  }

  void close() => database.close();
}
