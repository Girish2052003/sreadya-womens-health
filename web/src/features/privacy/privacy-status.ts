import type { NotificationPrivacy } from '../../domain/reminders/reminder-policy';

export const PRIVACY_CAPABILITY_IDS = [
  'PRIV-001', 'PRIV-002', 'PRIV-003', 'PRIV-004', 'PRIV-005',
  'PRIV-006', 'PRIV-007', 'PRIV-008', 'PRIV-009', 'PRIV-010',
  'PRIV-011', 'PRIV-012', 'PRIV-013', 'PRIV-014', 'PRIV-015',
  'PRIV-016', 'PRIV-017', 'PRIV-018', 'PRIV-019', 'PRIV-020',
  'PRIV-021',
] as const;

export type WebPrivacyStatus = {
  healthDataLocation: string;
  developerHealthDatabase: string;
  behaviorAnalytics: string;
  databaseProtection: string;
  platformHealthAccess: string;
  partnerLiveAccess: string;
  sync: string;
  appLock: string;
  appSwitcherProtection: string;
  notificationPrivacy: string;
  advertisingProfile: string;
};

function privacyLabel(value: NotificationPrivacy): string {
  switch (value) {
    case 'maximum': return 'Maximum Privacy';
    case 'balanced': return 'Balanced';
    case 'detailed': return 'Detailed';
  }
}

export function buildWebPrivacyStatus({
  notificationPrivacy,
}: {
  notificationPrivacy: NotificationPrivacy;
}): WebPrivacyStatus {
  return Object.freeze({
    healthDataLocation: 'This browser/device',
    developerHealthDatabase: 'None',
    behaviorAnalytics: 'Disabled',
    databaseProtection: 'AES-GCM encrypted local vault',
    platformHealthAccess: 'Not connected',
    partnerLiveAccess: 'None — explicit local preview/share only',
    sync: 'Unavailable — Phase F is not enabled',
    appLock: 'Unavailable in this Web build',
    appSwitcherProtection: 'Browser controlled — no Web guarantee',
    notificationPrivacy: privacyLabel(notificationPrivacy),
    advertisingProfile: 'None from reproductive-health data',
  });
}
