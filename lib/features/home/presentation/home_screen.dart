import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';

import '../../../app/providers.dart';
import '../../predictions/domain/cycle_prediction.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final prediction = ref.watch(predictionProvider);
    final periods = ref.watch(periodsProvider);
    return CustomScrollView(
      slivers: [
        const SliverAppBar.large(title: Text('Sreva')),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
          sliver: SliverList.list(
            children: [
              _PredictionCard(prediction: prediction),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () async {
                        await ref.read(healthActionsProvider).startPeriod(DateTime.now());
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Period start recorded for today.')),
                          );
                        }
                      },
                      icon: const Icon(Icons.water_drop_outlined),
                      label: const Text('Period started'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => GoRouter.of(context).go('/log'),
                      icon: const Icon(Icons.edit_note),
                      label: const Text('Log today'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Text('Recent history', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
              periods.when(
                data: (items) => items.isEmpty
                    ? const Card(child: Padding(padding: EdgeInsets.all(20), child: Text('Add at least two period starts to unlock predictions.')))
                    : Card(
                        child: Column(
                          children: items.reversed.take(4).map((p) {
                            final end = p.end == null ? 'ongoing' : DateFormat.yMMMd().format(p.end!);
                            return ListTile(
                              leading: const Icon(Icons.favorite_outline),
                              title: Text(DateFormat.yMMMd().format(p.start)),
                              subtitle: Text('End: $end'),
                            );
                          }).toList(),
                        ),
                      ),
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, _) => _ErrorCard(message: e.toString()),
              ),
              const SizedBox(height: 20),
              const Card(
                child: ListTile(
                  leading: Icon(Icons.lock_outline),
                  title: Text('Your cycle belongs to you'),
                  subtitle: Text('Core health data and prediction processing stay on this device.'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _PredictionCard extends StatelessWidget {
  const _PredictionCard({required this.prediction});
  final AsyncValue<CyclePrediction?> prediction;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: prediction.when(
          loading: () => const SizedBox(height: 110, child: Center(child: CircularProgressIndicator())),
          error: (e, _) => Text('Prediction unavailable: $e'),
          data: (p) {
            if (p == null) {
              return const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.eco_outlined, size: 36),
                  SizedBox(height: 12),
                  Text('Prediction needs more history', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
                  SizedBox(height: 6),
                  Text('Record at least two period starts. Sreva will never pretend to know what the data cannot support.'),
                ],
              );
            }
            final now = DateTime.now();
            final days = DateTime(p.mostLikelyDate.year, p.mostLikelyDate.month, p.mostLikelyDate.day)
                .difference(DateTime(now.year, now.month, now.day))
                .inDays;
            final confidence = switch (p.confidence) {
              PredictionConfidence.high => 'High',
              PredictionConfidence.medium => 'Medium',
              PredictionConfidence.low => 'Low',
            };
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(days >= 0 ? 'Period expected in about $days days' : 'Expected period window has passed', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Text('${DateFormat.MMMd().format(p.windowStart)} – ${DateFormat.MMMd().format(p.windowEnd)}'),
                const SizedBox(height: 4),
                Text('Confidence: $confidence · ${p.algorithmVersion}'),
                const SizedBox(height: 10),
                const Text('An estimate, not a biological guarantee.'),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _ErrorCard extends StatelessWidget {
  const _ErrorCard({required this.message});
  final String message;
  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text('Sreva could not open its local vault. $message'),
        ),
      );
}
