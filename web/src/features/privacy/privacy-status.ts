import type { NotificationPrivacy } from '../../domain/reminders/reminder-policy';

export const PRIVACY_CAPABILITY_IDS = [
  'PRIV-001','PRIV-002','PRIV-003','PRIV-004','PRIV-005','PRIV-006','PRIV-007','PRIV-008','PRIV-009','PRIV-010',
  'PRIV-011','PRIV-012','PRIV-013','PRIV-014','PRIV-015','PRIV-016','PRIV-017','PRIV-018','PRIV-019','PRIV-020','PRIV-021',
] as const;

export type WebPrivacyStatus = {
  healthDataLocation: string; developerHealthDatabase: string; behaviorAnalytics: string;
  databaseProtection: string; platformHealthAccess: string; partnerLiveAccess: string; sync: string;
  appLock: string; appSwitcherProtection: string; notificationPrivacy: string; advertisingProfile: string;
};

export function buildWebPrivacyStatus({
  notificationPrivacy,
  appLockConfigured = false,
}: {
  notificationPrivacy: NotificationPrivacy;
  appLockConfigured?: boolean;
}): WebPrivacyStatus {
  return Object.freeze({
    healthDataLocation: 'privacy.value.localDevice',
    developerHealthDatabase: 'privacy.value.none',
    behaviorAnalytics: 'privacy.value.disabled',
    databaseProtection: 'privacy.value.aesGcmLocalVault',
    platformHealthAccess: 'privacy.value.nativeHealthUnavailableWeb',
    partnerLiveAccess: 'privacy.value.explicitLocalShareOnly',
    sync: process.env.NEXT_PUBLIC_SREADYA_SYNC_BASE_URL
      ? 'privacy.value.continuityConfigured'
      : 'privacy.value.continuityUnconfigured',
    appLock: appLockConfigured
      ? 'privacy.value.pinEnabled'
      : 'privacy.value.pinNotConfigured',
    appSwitcherProtection: 'privacy.value.browserControlled',
    notificationPrivacy: `reminder.privacy.${notificationPrivacy}`,
    advertisingProfile: 'privacy.value.noneReproductiveHealth',
  });
}
