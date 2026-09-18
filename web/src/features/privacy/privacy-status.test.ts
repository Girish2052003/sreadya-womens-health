import { describe, expect, it } from 'vitest';

import { PRIVACY_CAPABILITY_IDS, buildWebPrivacyStatus } from './privacy-status';

describe('Web Privacy Center truthfulness', () => {
  it('tracks PRIV-001 through PRIV-021 without claiming unavailable native mechanisms', () => {
    expect(PRIVACY_CAPABILITY_IDS).toHaveLength(21);
    const status = buildWebPrivacyStatus({ notificationPrivacy: 'maximum', appLockConfigured: true });
    expect(status.healthDataLocation).toBe('This browser/device');
    expect(status.developerHealthDatabase).toBe('None');
    expect(status.behaviorAnalytics).toBe('Disabled');
    expect(status.databaseProtection).toContain('AES-GCM');
    expect(status.platformHealthAccess).toMatch(/unavailable in Web/);
    expect(status.appLock).toMatch(/PIN app lock enabled/);
    expect(status.appLock).toMatch(/native biometric protection not claimed/);
    expect(status.appSwitcherProtection).toMatch(/no Web guarantee/);
    expect(status.notificationPrivacy).toBe('Maximum Privacy');
    expect(status.advertisingProfile).toBe('None from reproductive-health data');
  });

  it('reports an unconfigured Web PIN truthfully instead of pretending biometric protection exists', () => {
    const status = buildWebPrivacyStatus({ notificationPrivacy: 'detailed', appLockConfigured: false });
    expect(status.appLock).toMatch(/not configured/);
    expect(status.appLock).toMatch(/native biometric protection not claimed/);
    expect(status.notificationPrivacy).toBe('Detailed');
  });
});
