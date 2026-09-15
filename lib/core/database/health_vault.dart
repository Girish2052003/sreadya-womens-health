import 'dart:io';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqlite3/sqlite3.dart';

import '../crypto/database_key_provider.dart';
import '../platform/privacy_platform.dart';

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

    final db = sqlite3.open(dbPath);
    try {
      // SQLCipher requires the key before any operation that reads database pages.
      db.execute('PRAGMA key = "$pragmaKey";');
      final cipher = db.select('PRAGMA cipher_version;');
      if (cipher.isEmpty || cipher.first.values.first.toString().trim().isEmpty) {
        throw StateError('Encrypted SQLite provider is unavailable.');
      }
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
      db.execute('''
        CREATE TABLE IF NOT EXISTS encrypted_records (
          id TEXT PRIMARY KEY,
          record_class TEXT NOT NULL,
          payload BLOB NOT NULL,
          updated_at TEXT NOT NULL
        ) STRICT;
      ''');
      db.execute(
        "INSERT OR IGNORE INTO metadata(key, value) VALUES('schema_version', '1');",
      );
      return HealthVault._(db, dbPath);
    } catch (_) {
      db.dispose();
      rethrow;
    }
  }

  int get schemaVersion {
    final result = database.select(
      "SELECT value FROM metadata WHERE key='schema_version' LIMIT 1;",
    );
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

  void close() => database.dispose();
}
