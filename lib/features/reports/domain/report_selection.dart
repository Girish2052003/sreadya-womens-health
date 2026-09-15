enum ReportCategory {
  periods,
  flow,
  symptoms,
  pain,
  medications,
  temperature,
  ovulation,
  privateNotes,
  sexualActivity,
}

class ReportSelection {
  const ReportSelection({required this.categories});

  factory ReportSelection.safeDefault() => const ReportSelection(
        categories: {
          ReportCategory.periods,
          ReportCategory.flow,
          ReportCategory.symptoms,
          ReportCategory.pain,
          ReportCategory.medications,
          ReportCategory.temperature,
          ReportCategory.ovulation,
        },
      );

  final Set<ReportCategory> categories;

  bool get includesHighlyPrivate =>
      categories.contains(ReportCategory.privateNotes) ||
      categories.contains(ReportCategory.sexualActivity);
}
