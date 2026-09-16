import { describe, expect, it } from 'vitest';

import { PRIVACY_CAPABILITY_IDS, buildWebPrivacyStatus } from './privacy-status';

describe('Task 13 Web Privacy Center truthfulness', () => {
  it('tracks PRIV-001 through PRIV-021 without claiming unavailable platform mechanisms', () => {
    expect(PRIVACY_CAPABILITY_IDS).toHaveLength(21);
    expect(PRIVACY_CAPABILITY_IDS[0]).toBe('PRIV-001');
    expect(PRIVACY_CAPABILITY_IDS.at(-1)).toBe('PRIV-021');

    const status = buildWebPrivacyStatus({ notificationPrivacy: 'maximum' });
    expect(status).toEqual({
      healthDataLocation: 'This browser/device',
      developerHealthDatabase: 'None',
      behaviorAnalytics: 'Disabled',
      databaseProtection: 'AES-GCM encrypted local vault',
      platformHealthAccess: 'Not connected',
      partnerLiveAccess: 'None — explicit local preview/share only',
      sync: 'Unavailable — Phase F is not enabled',
      appLock: 'Unavailable in this Web build',
      appSwitcherProtection: 'Browser controlled — no Web guarantee',
      notificationPrivacy: 'Maximum Privacy',
      advertisingProfile: 'None from reproductive-health data',
    });
  });

  it('never reports sync, biometrics, or app-switcher protection as active before their reviewed adapters exist', () => {
    const status = buildWebPrivacyStatus({ notificationPrivacy: 'detailed' });
    expect(status.sync).toMatch(/Unavailable/);
    expect(status.appLock).toMatch(/Unavailable/);
    expect(status.appSwitcherProtection).toMatch(/no Web guarantee/);
    expect(status.notificationPrivacy).toBe('Detailed');
  });
});
