enum PartnerShareCategory {
  prediction,
  cyclePhase,
  selectedReminder,
  selectedWellness,
}

class PartnerShareGrant {
  const PartnerShareGrant({required this.categories});
  final Set<PartnerShareCategory> categories;

  String buildSummary({
    String? predictionWindow,
    String? cyclePhase,
    String? selectedReminder,
    String? selectedWellness,
  }) {
    final buffer = StringBuffer('Sreadya shared summary');
    if (categories.contains(PartnerShareCategory.prediction) &&
        predictionWindow != null) {
      buffer.write('\nExpected period window: $predictionWindow');
    }
    if (categories.contains(PartnerShareCategory.cyclePhase) &&
        cyclePhase != null) {
      buffer.write('\nCycle: $cyclePhase');
    }
    if (categories.contains(PartnerShareCategory.selectedReminder) &&
        selectedReminder != null) {
      buffer.write('\nReminder: $selectedReminder');
    }
    if (categories.contains(PartnerShareCategory.selectedWellness) &&
        selectedWellness != null) {
      buffer.write('\nWellness: $selectedWellness');
    }
    buffer.write('\nShared intentionally by the Sreadya user.');
    return buffer.toString();
  }
}
