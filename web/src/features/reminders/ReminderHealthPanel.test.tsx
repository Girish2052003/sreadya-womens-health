import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { NotificationCapability } from '../../pwa/notification-capability';
import { ReminderHealthPanel } from './ReminderHealthPanel';

const capability: NotificationCapability = {
  mechanism: 'browser-notification',
  permission: 'granted',
  timeZone: 'Europe/Helsinki',
  installed: true,
  closedAppDelivery: 'not-guaranteed',
  reason: 'Browser notifications are available, but no reviewed push relay is configured.',
};

describe('ReminderHealthPanel', () => {
  it('shows the real delivery mechanism, permission, time zone and next reminder', () => {
    const html = renderToStaticMarkup(
      <ReminderHealthPanel
        capability={capability}
        privacy="balanced"
        nextReminder={{ kind: 'periodThreeDays', targetLocal: '2026-10-17T08:00', privacy: 'balanced' }}
      />,
    );

    for (const text of [
      'Reminder Health',
      'Browser notification',
      'Granted',
      'Europe/Helsinki',
      '17 October 2026',
      'Closed-app delivery is not guaranteed',
    ]) {
      expect(html.toLowerCase()).toContain(text.toLowerCase());
    }
  });

  it('describes Maximum Privacy as local/in-app rather than background push', () => {
    const html = renderToStaticMarkup(
      <ReminderHealthPanel
        capability={{ ...capability, mechanism: 'in-app' }}
        privacy="maximum"
        nextReminder={null}
      />,
    );

    expect(html).toContain('Maximum Privacy');
    expect(html.toLowerCase()).toContain('local to sreva');
  });
});
