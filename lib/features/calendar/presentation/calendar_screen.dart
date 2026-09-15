import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../app/providers.dart';
import '../../../core/settings/user_formatters.dart';
import '../../cycle/domain/cycle_models.dart';

enum HistoryViewMode { month, timeline, year }

class CalendarScreen extends ConsumerStatefulWidget {
  const CalendarScreen({super.key});

  @override
  ConsumerState<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends ConsumerState<CalendarScreen> {
  static const _uuid = Uuid();
  HistoryViewMode _mode = HistoryViewMode.month;
  DateTime _selectedMonth = DateTime.now();

  @override
  Widget build(BuildContext context) {
    final periods = ref.watch(periodsProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Calendar & history'),
        actions: [
          IconButton(
            tooltip: 'Add period',
            onPressed: () => _addPeriod(context),
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
            SegmentedButton<HistoryViewMode>(
              segments: const [
                ButtonSegment(
                  value: HistoryViewMode.month,
                  label: Text('Month'),
                  icon: Icon(Icons.calendar_month),
                ),
                ButtonSegment(
                  value: HistoryViewMode.timeline,
                  label: Text('Timeline'),
                  icon: Icon(Icons.view_timeline_outlined),
                ),
                ButtonSegment(
                  value: HistoryViewMode.year,
                  label: Text('Year'),
                  icon: Icon(Icons.calendar_view_month_outlined),
                ),
              ],
              selected: {_mode},
              onSelectionChanged: (value) =>
                  setState(() => _mode = value.first),
            ),
            const SizedBox(height: 16),
            switch (_mode) {
              HistoryViewMode.month => _monthView(items),
              HistoryViewMode.timeline => _timelineView(items),
              HistoryViewMode.year => _yearView(items),
            },
          ],
        ),
      ),
    );
  }

  Widget _monthView(List<PeriodEpisode> items) {
    final locale = Localizations.localeOf(context);
    final monthItems = items
        .where(
          (p) =>
              p.start.year == _selectedMonth.year &&
              p.start.month == _selectedMonth.month,
        )
        .toList(growable: false);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CalendarDatePicker(
          initialDate: _selectedMonth,
          firstDate: DateTime(2000),
          lastDate: DateTime.now().add(const Duration(days: 730)),
          onDateChanged: (date) => setState(() => _selectedMonth = date),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: Text(
                'Periods in ${UserFormatters.formatShortDate(DateTime(_selectedMonth.year, _selectedMonth.month, 1), locale)}',
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
            TextButton.icon(
              onPressed: () => _addPeriod(context),
              icon: const Icon(Icons.add),
              label: const Text('Backdate'),
            ),
          ],
        ),
        if (monthItems.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('No period starts recorded in this month.'),
            ),
          )
        else
          ...monthItems.reversed.map(_periodTile),
      ],
    );
  }

  Widget _timelineView(List<PeriodEpisode> items) {
    if (items.isEmpty) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(20),
          child: Text('No period history yet.'),
        ),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Period-day timeline',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 8),
        ...items.reversed.map(_periodTile),
      ],
    );
  }

  Widget _yearView(List<PeriodEpisode> items) {
    final locale = Localizations.localeOf(context);
    if (items.isEmpty) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(20),
          child: Text('No yearly history yet.'),
        ),
      );
    }
    final byYear = <int, List<PeriodEpisode>>{};
    for (final period in items) {
      byYear.putIfAbsent(period.start.year, () => []).add(period);
    }
    final years = byYear.keys.toList()..sort((a, b) => b.compareTo(a));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final year in years) ...[
          Card(
            child: ExpansionTile(
              title: Text(
                '$year · ${byYear[year]!.length} recorded period${byYear[year]!.length == 1 ? '' : 's'}',
              ),
              children: byYear[year]!
                  .map(
                    (p) => ListTile(
                      leading: const Icon(Icons.water_drop_outlined),
                      title: Text(UserFormatters.formatDate(p.start, locale)),
                      subtitle: Text(
                        p.durationDays == null
                            ? 'Ongoing'
                            : '${p.durationDays} recorded period days',
                      ),
                    ),
                  )
                  .toList(),
            ),
          ),
          const SizedBox(height: 8),
        ],
      ],
    );
  }

  Widget _periodTile(PeriodEpisode period) {
    final locale = Localizations.localeOf(context);
    final duration = period.durationDays;
    return Card(
      child: ListTile(
        leading: const Icon(Icons.water_drop_outlined),
        title: Text(UserFormatters.formatDate(period.start, locale)),
        subtitle: Text(
          period.end == null
              ? 'Ongoing · ${period.source.name}'
              : '${duration ?? 0} recorded period days · ended ${UserFormatters.formatDate(period.end!, locale)} · ${period.source.name}',
        ),
        trailing: PopupMenuButton<String>(
          onSelected: (value) {
            if (value == 'edit') _editPeriod(context, period);
            if (value == 'delete') _deletePeriod(context, period);
            if (value == 'end') _endPeriod(context, period);
          },
          itemBuilder: (_) => [
            const PopupMenuItem(value: 'edit', child: Text('Edit dates')),
            if (period.end == null)
              const PopupMenuItem(
                value: 'end',
                child: Text('Mark period ended'),
              ),
            const PopupMenuItem(value: 'delete', child: Text('Delete')),
          ],
        ),
      ),
    );
  }

  Future<void> _addPeriod(BuildContext context) async {
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
      if (mounted) setState(() => _selectedMonth = start);
    } catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Could not add period: $error')));
      }
    }
  }

  Future<void> _editPeriod(BuildContext context, PeriodEpisode period) async {
    final locale = Localizations.localeOf(context);
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
              : 'Current end: ${UserFormatters.formatDate(end, locale)}',
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

  Future<void> _endPeriod(BuildContext context, PeriodEpisode period) async {
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

  Future<void> _deletePeriod(BuildContext context, PeriodEpisode period) async {
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
