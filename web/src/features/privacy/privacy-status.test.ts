import { describe, expect, it } from 'vitest';

import { PRIVACY_CAPABILITY_IDS, buildWebPrivacyStatus } from './privacy-status';

describe('Web Privacy Center truthfulness', () => {
  it('tracks PRIV-001 through PRIV-021 without claiming unavailable native mechanisms', () => {
    expect(PRIVACY_CAPABILITY_IDS).toHaveLength(21);
    const status = buildWebPrivacyStatus({ notificationPrivacy: 'maximum', appLockConfigured: true });
    expect(status.healthDataLocation).toBe('privacy.value.localDevice');
    expect(status.developerHealthDatabase).toBe('privacy.value.none');
    expect(status.behaviorAnalytics).toBe('privacy.value.disabled');
    expect(status.databaseProtection).toBe('privacy.value.aesGcmLocalVault');
    expect(status.platformHealthAccess).toBe('privacy.value.nativeHealthUnavailableWeb');
    expect(status.appLock).toBe('privacy.value.pinEnabled');
    expect(status.appSwitcherProtection).toBe('privacy.value.browserControlled');
    expect(status.notificationPrivacy).toBe('reminder.privacy.maximum');
    expect(status.advertisingProfile).toBe('privacy.value.noneReproductiveHealth');
  });

  it('reports an unconfigured Web PIN truthfully instead of pretending biometric protection exists', () => {
    const status = buildWebPrivacyStatus({ notificationPrivacy: 'detailed', appLockConfigured: false });
    expect(status.appLock).toBe('privacy.value.pinNotConfigured');
    expect(status.notificationPrivacy).toBe('reminder.privacy.detailed');
  });
});
