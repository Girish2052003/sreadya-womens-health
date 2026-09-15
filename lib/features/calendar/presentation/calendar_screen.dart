import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:uuid/uuid.dart';

import '../../../app/providers.dart';
import '../../cycle/domain/cycle_models.dart';

class CalendarScreen extends ConsumerWidget {
  const CalendarScreen({super.key});
  static const _uuid = Uuid();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final periods = ref.watch(periodsProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Calendar & history'),
        actions: [
          IconButton(
            tooltip: 'Add period',
            onPressed: () => _addPeriod(context, ref),
            icon: const Icon(Icons.add),
          ),
        ],
      ),
      body: periods.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) =>
            Center(child: Text('Unable to load local history: $e')),
        data: (items) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            CalendarDatePicker(
              initialDate: DateTime.now(),
              firstDate: DateTime(2000),
              lastDate: DateTime.now().add(const Duration(days: 730)),
              onDateChanged: (_) {},
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Period history',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                TextButton.icon(
                  onPressed: () => _addPeriod(context, ref),
                  icon: const Icon(Icons.add),
                  label: const Text('Backdate'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (items.isEmpty)
              const Card(
                child: Padding(
                  padding: EdgeInsets.all(20),
                  child: Text('No period history yet.'),
                ),
              )
            else
              ...items.reversed.map(
                (period) => Card(
                  child: ListTile(
                    leading: const Icon(Icons.water_drop_outlined),
                    title: Text(DateFormat.yMMMd().format(period.start)),
                    subtitle: Text(
                      '${period.end == null ? 'Ongoing' : '${period.durationDays} days · ended ${DateFormat.yMMMd().format(period.end!)}'} · ${period.source.name}',
                    ),
                    trailing: PopupMenuButton<String>(
                      onSelected: (value) {
                        if (value == 'edit') _editPeriod(context, ref, period);
                        if (value == 'delete') {
                          _deletePeriod(context, ref, period);
                        }
                        if (value == 'end') _endPeriod(context, ref, period);
                      },
                      itemBuilder: (_) => [
                        const PopupMenuItem(
                          value: 'edit',
                          child: Text('Edit dates'),
                        ),
                        if (period.end == null)
                          const PopupMenuItem(
                            value: 'end',
                            child: Text('Mark period ended'),
                          ),
                        const PopupMenuItem(
                          value: 'delete',
                          child: Text('Delete'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _addPeriod(BuildContext context, WidgetRef ref) async {
    final now = DateTime.now();
    final start = await showDatePicker(
      context: context,
      initialDate: now,
      firstDate: DateTime(now.year - 10),
      lastDate: now,
    );
    if (start == null) return;
    try {
      await ref
          .read(healthActionsProvider)
          .savePeriod(PeriodEpisode(id: _uuid.v7(), start: start));
    } catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Could not add period: $error')));
      }
    }
  }

  Future<void> _editPeriod(
    BuildContext context,
    WidgetRef ref,
    PeriodEpisode period,
  ) async {
    final start = await showDatePicker(
      context: context,
      initialDate: period.start,
      firstDate: DateTime(period.start.year - 10),
      lastDate: DateTime.now(),
    );
    if (start == null || !context.mounted) return;
    DateTime? end = period.end;
    final chooseEnd = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit period end?'),
        content: Text(
          end == null
              ? 'This period is currently ongoing.'
              : 'Current end: ${DateFormat.yMMMd().format(end)}',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Keep'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Choose end'),
          ),
        ],
      ),
    );
    if (chooseEnd == true && context.mounted) {
      end = await showDatePicker(
        context: context,
        initialDate: end ?? start,
        firstDate: start,
        lastDate: DateTime.now(),
      );
    }
    try {
      await ref
          .read(healthActionsProvider)
          .savePeriod(
            PeriodEpisode(
              id: period.id,
              start: start,
              end: end,
              source: period.source,
              externalId: period.externalId,
            ),
          );
    } catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not edit period: $error')),
        );
      }
    }
  }

  Future<void> _endPeriod(
    BuildContext context,
    WidgetRef ref,
    PeriodEpisode period,
  ) async {
    final end = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: period.start,
      lastDate: DateTime.now(),
    );
    if (end == null) return;
    await ref
        .read(healthActionsProvider)
        .savePeriod(
          PeriodEpisode(
            id: period.id,
            start: period.start,
            end: end,
            source: period.source,
            externalId: period.externalId,
          ),
        );
  }

  Future<void> _deletePeriod(
    BuildContext context,
    WidgetRef ref,
    PeriodEpisode period,
  ) async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete this period record?'),
        content: const Text(
          'This changes future predictions. The action cannot be undone unless you have a CycleVault backup.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (yes == true) {
      await ref.read(healthActionsProvider).deletePeriod(period.id);
    }
  }
}
