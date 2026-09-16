import type { NotificationPrivacy } from '../domain/reminders/reminder-policy';

export type ReminderMechanism = 'in-app' | 'browser-notification' | 'web-push';
export type ReminderPermission = NotificationPermission | 'unsupported';
export type ClosedAppDelivery = 'not-guaranteed' | 'available-with-reviewed-relay';

export type NotificationCapabilityInput = {
  privacy: NotificationPrivacy;
  notificationApi: boolean;
  permission: ReminderPermission;
  serviceWorker: boolean;
  pushManager: boolean;
  reviewedPushRelayConfigured: boolean;
  installed: boolean;
  timeZone: string;
};

export type NotificationCapability = {
  mechanism: ReminderMechanism;
  permission: ReminderPermission;
  timeZone: string;
  installed: boolean;
  closedAppDelivery: ClosedAppDelivery;
  reason: string;
};

export function evaluateNotificationCapability(
  input: NotificationCapabilityInput,
): NotificationCapability {
  const common = {
    permission: input.permission,
    timeZone: input.timeZone,
    installed: input.installed,
  };

  if (input.privacy === 'maximum') {
    return {
      ...common,
      mechanism: 'in-app',
      closedAppDelivery: 'not-guaranteed',
      reason: 'Maximum Privacy keeps reminder delivery local to Sreva.',
    };
  }

  if (!input.notificationApi || input.permission === 'unsupported') {
    return {
      ...common,
      mechanism: 'in-app',
      closedAppDelivery: 'not-guaranteed',
      reason: 'This browser does not expose notification delivery, so Sreva will show reminders while the app is open.',
    };
  }

  if (input.permission !== 'granted') {
    return {
      ...common,
      mechanism: 'in-app',
      closedAppDelivery: 'not-guaranteed',
      reason: input.permission === 'denied'
        ? 'Browser notification permission is denied; in-app reminders remain available.'
        : 'Browser notification permission has not been granted; in-app reminders remain available.',
    };
  }

  if (
    input.serviceWorker
    && input.pushManager
    && input.reviewedPushRelayConfigured
  ) {
    return {
      ...common,
      mechanism: 'web-push',
      closedAppDelivery: 'available-with-reviewed-relay',
      reason: 'A reviewed push relay and the required browser capabilities are configured.',
    };
  }

  return {
    ...common,
    mechanism: 'browser-notification',
    closedAppDelivery: 'not-guaranteed',
    reason: 'Browser notifications are available while Sreva is active, but no reviewed push relay is configured for guaranteed closed-app delivery.',
  };
}

function isInstalledWebApp(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  return Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function detectNotificationCapability(
  privacy: NotificationPrivacy,
): NotificationCapability {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return evaluateNotificationCapability({
      privacy,
      notificationApi: false,
      permission: 'unsupported',
      serviceWorker: false,
      pushManager: false,
      reviewedPushRelayConfigured: false,
      installed: false,
      timeZone: 'UTC',
    });
  }

  const notificationApi = 'Notification' in window;
  const permission: ReminderPermission = notificationApi
    ? Notification.permission
    : 'unsupported';

  return evaluateNotificationCapability({
    privacy,
    notificationApi,
    permission,
    serviceWorker: 'serviceWorker' in navigator,
    pushManager: 'PushManager' in window,
    // Phase D deliberately has no production relay. This may only become true
    // after the reviewed backend/security gate supplies an approved adapter.
    reviewedPushRelayConfigured: false,
    installed: isInstalledWebApp(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  });
}
