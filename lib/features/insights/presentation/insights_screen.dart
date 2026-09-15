import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers.dart';
import '../../cycle/domain/cycle_models.dart';
import '../../predictions/domain/prediction_history.dart';
import '../domain/insight_engine.dart';

class InsightsScreen extends ConsumerWidget {
  const InsightsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final periods = ref.watch(periodsProvider);
    final observations = ref.watch(observationsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Insights')),
      body: periods.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) =>
            Center(child: Text('Unable to calculate insights: $error')),
        data: (periodItems) => observations.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) =>
              Center(child: Text('Unable to load observations: $error')),
          data: (observationItems) => FutureBuilder(
            future: _build(ref, periodItems, observationItems),
            builder: (context, snapshot) {
              if (!snapshot.hasData) {
                return const Center(child: CircularProgressIndicator());
              }
              final insight = snapshot.data!;
              return ListView(
                padding: const EdgeInsetsDirectional.fromSTEB(16, 16, 16, 28),
                children: [
                  Text(
                    'Your patterns',
                    style: Theme.of(context).textTheme.headlineSmall
                        ?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Sreva describes what you recorded. It does not invent medical causes.',
                  ),
                  const SizedBox(height: 16),
                  if (insight.cycleSummary == null)
                    const Card(
                      child: Padding(
                        padding: EdgeInsets.all(20),
                        child: Text(
                          'More completed cycles are needed for cycle statistics.',
                        ),
                      ),
                    )
                  else
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: [
                        _Metric(
                          label: 'Average cycle',
                          value:
                              '${insight.cycleSummary!.averageLength.toStringAsFixed(1)} days',
                        ),
                        _Metric(
                          label: 'Shortest',
                          value: '${insight.cycleSummary!.shortestLength} days',
                        ),
                        _Metric(
                          label: 'Longest',
                          value: '${insight.cycleSummary!.longestLength} days',
                        ),
                        _Metric(
                          label: 'Variation',
                          value:
                              '±${insight.cycleSummary!.standardDeviation.toStringAsFixed(1)} days',
                        ),
                        if (insight.averagePeriodDurationDays != null)
                          _Metric(
                            label: 'Average period',
                            value:
                                '${insight.averagePeriodDurationDays!.toStringAsFixed(1)} days',
                          ),
                      ],
                    ),
                  const SizedBox(height: 24),
                  Text(
                    'Observed trends',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  if (insight.observationalMessages.isEmpty)
                    const Card(
                      child: Padding(
                        padding: EdgeInsets.all(16),
                        child: Text(
                          'Log more symptoms, mood, sleep, energy and flow to build explainable trends.',
                        ),
                      ),
                    )
                  else
                    ...insight.observationalMessages
                        .take(8)
                        .map(
                          (message) => Card(
                            child: ListTile(
                              leading: const Icon(Icons.auto_graph_outlined),
                              title: Text(message),
                            ),
                          ),
                        ),
                  const SizedBox(height: 24),
                  Text(
                    'Prediction calibration',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  _PredictionCalibration(
                    evaluation: insight.predictionEvaluation,
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'Logging frequency',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  if (insight.observationCounts.isEmpty)
                    const Text('No health observations logged yet.')
                  else
                    Card(
                      child: Column(
                        children:
                            (insight.observationCounts.entries.toList()
                                  ..sort((a, b) => b.value.compareTo(a.value)))
                                .take(10)
                                .map(
                                  (entry) => ListTile(
                                    title: Text(entry.key.name),
                                    trailing: Text('${entry.value} logs'),
                                  ),
                                )
                                .toList(),
                      ),
                    ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  Future<InsightSnapshot> _build(
    WidgetRef ref,
    List<PeriodEpisode> periods,
    List<HealthObservation> observations,
  ) async {
    final history = await ref.read(predictionHistoryStoreProvider.future);
    final evaluation = await history.evaluateAgainst(
      periods.map((item) => item.start).toList(),
    );
    return InsightEngine().summarize(
      periods: periods,
      observations: observations,
      predictionEvaluation: evaluation,
    );
  }
}

class _PredictionCalibration extends StatelessWidget {
  const _PredictionCalibration({required this.evaluation});
  final PredictionEvaluation? evaluation;

  @override
  Widget build(BuildContext context) {
    final value = evaluation;
    if (value == null || value.sampleCount == 0) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Text(
            'Calibration begins after Sreva has made predictions and later observes actual period starts.',
          ),
        ),
      );
    }
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: [
        _Metric(label: 'Evaluated predictions', value: '${value.sampleCount}'),
        _Metric(
          label: 'Mean error',
          value: '${value.meanAbsoluteErrorDays.toStringAsFixed(1)} days',
        ),
        _Metric(
          label: 'Median error',
          value: '${value.medianAbsoluteErrorDays.toStringAsFixed(1)} days',
        ),
        _Metric(
          label: 'Window coverage',
          value: '${(value.windowCoverage * 100).toStringAsFixed(0)}%',
        ),
      ],
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 160,
    child: Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              value,
              style: Theme.of(context).textTheme.titleLarge
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 4),
            Text(label),
          ],
        ),
      ),
    ),
  );
}
