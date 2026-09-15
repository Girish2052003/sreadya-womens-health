abstract final class HealthLogPolicy {
  static const Set<String> forbiddenFieldFragments = {
    'period_date',
    'symptom',
    'sexual',
    'pregnancy',
    'fertility',
    'temperature',
    'medication_name',
    'healthkit_payload',
    'health_connect_payload',
    'note_text',
  };

  static bool isSafeKey(String key) {
    final normalized = key.toLowerCase();
    return !forbiddenFieldFragments.any(normalized.contains);
  }
}
