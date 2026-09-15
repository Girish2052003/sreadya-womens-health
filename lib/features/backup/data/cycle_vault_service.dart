import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:cryptography/cryptography.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import '../../../core/version/app_versions.dart';
import '../../cycle/domain/cycle_models.dart';
import '../domain/restore_transaction.dart';

enum CycleVaultRestoreMode { replaceAll, merge }

class CycleVaultRestoreResult {
  const CycleVaultRestoreResult({
    required this.periods,
    required this.observations,
    required this.mode,
  });
  final int periods;
  final int observations;
  final CycleVaultRestoreMode mode;
}

class _StagedRestore {
  const _StagedRestore(this.periods, this.observations);
  final List<PeriodEpisode> periods;
  final List<HealthObservation> observations;
}

class CycleVaultService {
  CycleVaultService({required HealthRepository repository})
    : _repository = repository;

  static const String format = 'SREVA-CYCLEVAULT';
  static const int formatVersion = 1;
  final HealthRepository _repository;
  final AesGcm _cipher = AesGcm.with256bits();
  final Argon2id _kdf = Argon2id(
    memory: 19 * 1024,
    parallelism: 1,
    iterations: 2,
    hashLength: 32,
  );

  Future<String> exportToFile(String passphrase) async {
    if (passphrase.length < 12) {
      throw ArgumentError(
        'CycleVault recovery passphrase must be at least 12 characters.',
      );
    }
    final periods = await _repository.listPeriods();
    final observations = await _repository.listObservations();
    final payload = utf8.encode(
      jsonEncode({
        'periods': periods.map(_periodToJson).toList(),
        'observations': observations.map(_observationToJson).toList(),
      }),
    );

    final salt = _randomBytes(16);
    final key = await _kdf.deriveKeyFromPassword(
      password: passphrase,
      nonce: salt,
    );
    final manifest = {
      'format': format,
      'formatVersion': formatVersion,
      'createdAtUtc': DateTime.now().toUtc().toIso8601String(),
      'appVersion': AppVersions.app,
      'databaseSchema': AppVersions.databaseSchema,
      'predictionEngine': AppVersions.predictionEngine,
      'kdf': 'argon2id-m19MiB-t2-p1',
      'cipher': 'aes-256-gcm',
    };
    final aad = utf8.encode(jsonEncode(manifest));
    final box = await _cipher.encrypt(payload, secretKey: key, aad: aad);
    final outer = {
      'manifest': manifest,
      'salt': base64Encode(salt),
      'sealedPayload': base64Encode(box.concatenation()),
    };

    final directory = await getTemporaryDirectory();
    final name =
        'sreva-${DateTime.now().toUtc().toIso8601String().replaceAll(':', '-')}.cyclevault';
    final file = File(p.join(directory.path, name));
    await file.writeAsString(jsonEncode(outer), flush: true);
    return file.path;
  }

  Future<CycleVaultRestoreResult> restoreFromFile(
    String path,
    String passphrase, {
    CycleVaultRestoreMode mode = CycleVaultRestoreMode.replaceAll,
  }) async {
    final outer =
        jsonDecode(await File(path).readAsString()) as Map<String, dynamic>;
    final manifest = Map<String, dynamic>.from(outer['manifest'] as Map);
    if (manifest['format'] != format ||
        manifest['formatVersion'] != formatVersion) {
      throw const FormatException('Unsupported CycleVault format.');
    }
    final salt = base64Decode(outer['salt'] as String);
    final sealed = base64Decode(outer['sealedPayload'] as String);
    final key = await _kdf.deriveKeyFromPassword(
      password: passphrase,
      nonce: salt,
    );
    final box = SecretBox.fromConcatenation(
      sealed,
      nonceLength: _cipher.nonceLength,
      macLength: _cipher.macAlgorithm.macLength,
      copy: false,
    );
    final clear = await _cipher.decrypt(
      box,
      secretKey: key,
      aad: utf8.encode(jsonEncode(manifest)),
    );
    final payload = jsonDecode(utf8.decode(clear)) as Map<String, dynamic>;
    final periods = (payload['periods'] as List<dynamic>? ?? const [])
        .map(
          (value) => _periodFromJson(Map<String, dynamic>.from(value as Map)),
        )
        .toList(growable: false);
    final observations = (payload['observations'] as List<dynamic>? ?? const [])
        .map(
          (value) =>
              _observationFromJson(Map<String, dynamic>.from(value as Map)),
        )
        .toList(growable: false);
    final staged = _StagedRestore(periods, observations);

    if (mode == CycleVaultRestoreMode.replaceAll) {
      final coordinator = RestoreTransactionCoordinator<_StagedRestore>();
      await coordinator.commit(
        live: _StagedRestore(
          await _repository.listPeriods(),
          await _repository.listObservations(),
        ),
        staged: staged,
        validate: (value) async => _validateStaged(value),
        replaceLive: (value) => _repository.replaceAll(
          periods: value.periods,
          observations: value.observations,
        ),
      );
      return CycleVaultRestoreResult(
        periods: periods.length,
        observations: observations.length,
        mode: mode,
      );
    }

    if (!_validateStaged(staged)) {
      throw StateError('CycleVault restore failed domain validation.');
    }
    final existingPeriods = await _repository.listPeriods();
    var restoredPeriods = 0;
    for (final period in periods) {
      final duplicate = existingPeriods.any(
        (current) =>
            _sameDay(current.start, period.start) &&
            ((current.end == null && period.end == null) ||
                (current.end != null &&
                    period.end != null &&
                    _sameDay(current.end!, period.end!))),
      );
      if (duplicate) continue;
      await _repository.savePeriod(period);
      existingPeriods.add(period);
      restoredPeriods++;
    }
    final existingObservations = await _repository.listObservations();
    final existingIds = existingObservations.map((value) => value.id).toSet();
    var restoredObservations = 0;
    for (final observation in observations) {
      if (!existingIds.add(observation.id)) continue;
      await _repository.saveObservation(observation);
      restoredObservations++;
    }
    return CycleVaultRestoreResult(
      periods: restoredPeriods,
      observations: restoredObservations,
      mode: mode,
    );
  }

  bool _validateStaged(_StagedRestore staged) {
    final periodIds = <String>{};
    final ordered = [...staged.periods]
      ..sort((a, b) => a.start.compareTo(b.start));
    for (var i = 0; i < ordered.length; i++) {
      final current = ordered[i];
      if (!periodIds.add(current.id)) return false;
      if (current.end != null && current.end!.isBefore(current.start))
        return false;
      if (i > 0) {
        final previous = ordered[i - 1];
        final previousEnd = previous.end ?? previous.start;
        if (!previousEnd.isBefore(current.start)) return false;
      }
    }
    final observationIds = <String>{};
    for (final observation in staged.observations) {
      if (!observationIds.add(observation.id)) return false;
    }
    return true;
  }

  bool _sameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  List<int> _randomBytes(int count) {
    final random = Random.secure();
    return List<int>.generate(
      count,
      (_) => random.nextInt(256),
      growable: false,
    );
  }

  Map<String, Object?> _periodToJson(PeriodEpisode value) => {
    'id': value.id,
    'start': value.start.toUtc().toIso8601String(),
    'end': value.end?.toUtc().toIso8601String(),
    'source': value.source.name,
    'externalId': value.externalId,
  };

  PeriodEpisode _periodFromJson(Map<String, dynamic> json) => PeriodEpisode(
    id: json['id'] as String,
    start: DateTime.parse(json['start'] as String).toLocal(),
    end: json['end'] == null
        ? null
        : DateTime.parse(json['end'] as String).toLocal(),
    source: RecordSource.cycleVault,
    externalId: json['externalId'] as String?,
  );

  Map<String, Object?> _observationToJson(HealthObservation value) => {
    'id': value.id,
    'kind': value.kind.name,
    'occurredAt': value.occurredAt.toUtc().toIso8601String(),
    'severity': value.severity?.name,
    'numericValue': value.numericValue,
    'unit': value.unit,
    'label': value.label,
    'note': value.note,
    'flowLevel': value.flowLevel?.name,
    'source': value.source.name,
    'externalId': value.externalId,
  };

  HealthObservation _observationFromJson(Map<String, dynamic> json) =>
      HealthObservation(
        id: json['id'] as String,
        kind: ObservationKind.values.byName(json['kind'] as String),
        occurredAt: DateTime.parse(json['occurredAt'] as String).toLocal(),
        severity: json['severity'] == null
            ? null
            : ObservationSeverity.values.byName(json['severity'] as String),
        numericValue: (json['numericValue'] as num?)?.toDouble(),
        unit: json['unit'] as String?,
        label: json['label'] as String?,
        note: json['note'] as String?,
        flowLevel: json['flowLevel'] == null
            ? null
            : FlowLevel.values.byName(json['flowLevel'] as String),
        source: RecordSource.cycleVault,
        externalId: json['externalId'] as String?,
      );
}
