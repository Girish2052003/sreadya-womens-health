import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers.dart';
import '../../../core/settings/user_formatters.dart';
import '../domain/cycle_prediction.dart';

class PredictionDetailsScreen extends ConsumerWidget {
  const PredictionDetailsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final prediction = ref.watch(predictionProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Prediction details')),
      body: prediction.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) =>
            Center(child: Text('Prediction unavailable: $error')),
        data: (value) {
          if (value == null) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'Sreva needs at least two valid period starts before it can estimate a future cycle.',
                ),
              ),
            );
          }
          final locale = Localizations.localeOf(context);
          final confidence = switch (value.confidence) {
            PredictionConfidence.high => 'High',
            PredictionConfidence.medium => 'Medium',
            PredictionConfidence.low => 'Low',
          };
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Most likely start',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      Text(
                        UserFormatters.formatDate(value.mostLikelyDate, locale),
                        style: Theme.of(context).textTheme.headlineSmall
                            ?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Likely window: ${UserFormatters.formatDate(value.windowStart, locale)} – ${UserFormatters.formatDate(value.windowEnd, locale)}',
                      ),
                      Text('Confidence: $confidence'),
                      Text(
                        'Estimated cycle length: ${value.estimatedCycleLengthDays} days',
                      ),
                      if (value.estimatedPeriodDurationDays != null)
                        Text(
                          'Estimated period duration: about ${value.estimatedPeriodDurationDays} days',
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Why this estimate?',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      Text('Algorithm: ${value.algorithmVersion}'),
                      Text(
                        'Valid recent cycle intervals: ${value.validIntervals.join(', ')} days',
                      ),
                      Text(
                        'Excluded implausible intervals: ${value.excludedIntervals.isEmpty ? 'none' : value.excludedIntervals.join(', ')}',
                      ),
                      Text(
                        'Median absolute deviation: ${value.medianAbsoluteDeviation.toStringAsFixed(1)} days',
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              const Card(
                child: Padding(
                  padding: EdgeInsets.all(18),
                  child: Text(
                    'This is an on-device estimate from your recorded history. It is not a diagnosis, a fertility guarantee, or a contraceptive prediction.',
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
