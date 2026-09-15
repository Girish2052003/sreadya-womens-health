import 'dart:typed_data';

import 'package:uuid/uuid.dart';

import '../../../core/crypto/vault_cipher.dart';
import '../../../core/database/health_vault.dart';
import '../domain/cycle_prediction.dart';
import '../domain/prediction_history.dart';

class PredictionHistoryRecord {
  const PredictionHistoryRecord({required this.id, required this.prediction});
  final String id;
  final CyclePrediction prediction;
}

class PredictionHistoryStore {
  PredictionHistoryStore({required this._vault, required this._cipher});

  final HealthVault _vault;
  final VaultCipher _cipher;
  static const _uuid = Uuid();

  Future<void> recordIfNew(CyclePrediction prediction) async {
    final existing = await list();
    final duplicate = existing.any(
      (record) =>
          record.prediction.algorithmVersion == prediction.algorithmVersion &&
          _sameDay(record.prediction.mostLikelyDate, prediction.mostLikelyDate) &&
          _sameIntervals(record.prediction.validIntervals, prediction.validIntervals),
    );
    if (duplicate) return;
    final payload = await _cipher.encryptJson(_toJson(prediction));
    _vault.database.execute(
      '''
      INSERT INTO encrypted_records(id, record_class, payload, updated_at)
      VALUES(?, 'prediction', ?, ?);
      ''',
      [_uuid.v7(), payload, DateTime.now().toUtc().toIso8601String()],
    );
  }

  Future<List<PredictionHistoryRecord>> list() async {
    final rows = _vault.database.select(
      "SELECT id, payload FROM encrypted_records WHERE record_class='prediction' ORDER BY updated_at;",
    );
    final result = <PredictionHistoryRecord>[];
    for (final row in rows) {
      final json = await _cipher.decryptJson(row['payload'] as Uint8List);
      result.add(
        PredictionHistoryRecord(
          id: row['id'] as String,
          prediction: _fromJson(json),
        ),
      );
    }
    return result;
  }

  Future<PredictionEvaluation> evaluateAgainst(List<DateTime> actualStarts) async {
    final records = await list();
    final outcomes = <PredictionOutcome>[];
    final starts = actualStarts.map(_date).toList()..sort();
    for (final record in records) {
      final prediction = record.prediction;
      DateTime? actual;
      for (final candidate in starts) {
        if (!candidate.isBefore(_date(prediction.createdAt))) {
          actual = candidate;
          break;
        }
      }
      if (actual != null) {
        outcomes.add(PredictionOutcome(prediction: prediction, actualStart: actual));
      }
    }
    return PredictionEvaluator().evaluate(outcomes);
  }

  Map<String, Object?> _toJson(CyclePrediction value) => {
    'algorithmVersion': value.algorithmVersion,
    'createdAt': value.createdAt.toUtc().toIso8601String(),
    'estimatedCycleLengthDays': value.estimatedCycleLengthDays,
    'estimatedPeriodDurationDays': value.estimatedPeriodDurationDays,
    'mostLikelyDate': value.mostLikelyDate.toIso8601String(),
    'windowStart': value.windowStart.toIso8601String(),
    'windowEnd': value.windowEnd.toIso8601String(),
    'confidence': value.confidence.name,
    'validIntervals': value.validIntervals,
    'excludedIntervals': value.excludedIntervals,
    'medianAbsoluteDeviation': value.medianAbsoluteDeviation,
  };

  CyclePrediction _fromJson(Map<String, dynamic> json) => CyclePrediction(
    algorithmVersion: json['algorithmVersion'] as String,
    createdAt: DateTime.parse(json['createdAt'] as String).toLocal(),
    estimatedCycleLengthDays: json['estimatedCycleLengthDays'] as int,
    estimatedPeriodDurationDays: (json['estimatedPeriodDurationDays'] as num?)?.toInt(),
    mostLikelyDate: DateTime.parse(json['mostLikelyDate'] as String),
    windowStart: DateTime.parse(json['windowStart'] as String),
    windowEnd: DateTime.parse(json['windowEnd'] as String),
    confidence: PredictionConfidence.values.byName(json['confidence'] as String),
    validIntervals: List<int>.from(json['validIntervals'] as List<dynamic>),
    excludedIntervals: List<int>.from(json['excludedIntervals'] as List<dynamic>),
    medianAbsoluteDeviation: (json['medianAbsoluteDeviation'] as num).toDouble(),
  );

  bool _sameIntervals(List<int> a, List<int> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  bool _sameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  DateTime _date(DateTime value) => DateTime(value.year, value.month, value.day);
}
