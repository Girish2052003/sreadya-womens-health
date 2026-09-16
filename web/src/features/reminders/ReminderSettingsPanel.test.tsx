import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DEFAULT_REMINDER_SETTINGS } from './reminder-settings-repository';
import { ReminderSettingsPanel } from './ReminderSettingsPanel';

describe('ReminderSettingsPanel', () => {
  it('exposes the frozen 7/3/1/expected/late, quiet-hour and privacy controls', () => {
    const html = renderToStaticMarkup(
      <ReminderSettingsPanel
        settings={{ ...DEFAULT_REMINDER_SETTINGS, enabledOffsetsDays: [7, 3, 1, 0], lateDays: 2 }}
        saving={false}
        onChange={() => undefined}
        onSave={() => undefined}
      />,
    );

    for (const text of [
      'Reminder settings',
      '7 days before',
      '3 days before',
      '1 day before',
      'Expected day',
      'Late reminder',
      'Quiet hours',
      'Maximum Privacy',
      'Balanced',
      'Detailed',
      'Save reminder settings',
    ]) {
      expect(html).toContain(text);
    }

    expect(html).toContain('value="22"');
    expect(html).toContain('value="7"');
    expect(html).toContain('value="8"');
  });
});
