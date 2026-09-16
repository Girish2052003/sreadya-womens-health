import { describe, expect, it } from 'vitest';

import { evaluateNotificationCapability } from './notification-capability';

describe('adaptive Web reminder capability', () => {
  it('keeps Maximum Privacy local and honest even when browser notification APIs exist', () => {
    expect(evaluateNotificationCapability({
      privacy: 'maximum',
      notificationApi: true,
      permission: 'granted',
      serviceWorker: true,
      pushManager: true,
      reviewedPushRelayConfigured: false,
      installed: true,
      timeZone: 'Europe/Helsinki',
    })).toEqual({
      mechanism: 'in-app',
      permission: 'granted',
      timeZone: 'Europe/Helsinki',
      installed: true,
      closedAppDelivery: 'not-guaranteed',
      reason: 'Maximum Privacy keeps reminder delivery local to Sreva.',
    });
  });

  it('does not advertise Web Push merely because the browser exposes PushManager', () => {
    const capability = evaluateNotificationCapability({
      privacy: 'balanced',
      notificationApi: true,
      permission: 'granted',
      serviceWorker: true,
      pushManager: true,
      reviewedPushRelayConfigured: false,
      installed: true,
      timeZone: 'Asia/Kolkata',
    });

    expect(capability.mechanism).toBe('browser-notification');
    expect(capability.closedAppDelivery).toBe('not-guaranteed');
    expect(capability.reason).toContain('reviewed push relay');
  });

  it('falls back to in-app reminders when browser notifications are unsupported', () => {
    expect(evaluateNotificationCapability({
      privacy: 'balanced',
      notificationApi: false,
      permission: 'unsupported',
      serviceWorker: false,
      pushManager: false,
      reviewedPushRelayConfigured: false,
      installed: false,
      timeZone: 'UTC',
    }).mechanism).toBe('in-app');
  });

  it('reports Web Push only when permission, service worker, PushManager and a reviewed relay are all available', () => {
    const capability = evaluateNotificationCapability({
      privacy: 'balanced',
      notificationApi: true,
      permission: 'granted',
      serviceWorker: true,
      pushManager: true,
      reviewedPushRelayConfigured: true,
      installed: true,
      timeZone: 'Europe/Helsinki',
    });

    expect(capability.mechanism).toBe('web-push');
    expect(capability.closedAppDelivery).toBe('available-with-reviewed-relay');
  });
});
