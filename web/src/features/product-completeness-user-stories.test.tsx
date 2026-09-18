import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { ReminderPolicySettings } from '../../domain/reminders/reminder-policy';
import { PredictionCorePanel } from '../predictions/PredictionCorePanel';
import { ReminderSettingsPanel } from '../reminders/ReminderSettingsPanel';

describe('final product-completeness user stories', () => {
  it('surfaces the complete prediction context rather than only the next-period date', () => {
    const html = renderToStaticMarkup(<PredictionCorePanel prediction={{
      algorithmVersion: 'prediction-v1',
      estimatedCycleLengthDays: 29,
      estimatedPeriodDurationDays: 5,
      mostLikelyDate: '2026-10-18',
      windowStart: '2026-10-15',
      windowEnd: '2026-10-21',
      confidence: 'medium',
      validIntervals: [28, 29, 30, 29],
      excludedIntervals: [],
      medianAbsoluteDeviation: 1,
    }} />);

    for (const text of [
      'PMS estimate',
      'Ovulation estimate',
      'Estimated fertile window',
      'Algorithm version',
      'Prediction history',
      'not contraceptive guidance',
    ]) {
      expect(html).toContain(text);
    }
  });

  it('surfaces personal reminder families and snooze alongside cycle reminders', () => {
    const settings: ReminderPolicySettings = {
      enabledOffsetsDays: [3],
      lateDays: 2,
      hour: 8,
      minute: 0,
      privacy: 'maximum',
      quietStartHour: 22,
      quietEndHour: 7,
    };
    const html = renderToStaticMarkup(
      <ReminderSettingsPanel
        settings={settings}
        saving={false}
        onChange={() => undefined}
        onSave={() => undefined}
      />,
    );

    for (const text of [
      'Medication reminder',
      'Contraception reminder',
      'Supplement reminder',
      'Ovulation-test reminder',
      'Pregnancy-test reminder',
      'Snooze',
    ]) {
      expect(html).toContain(text);
    }
  });
});
