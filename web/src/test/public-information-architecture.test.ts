import { describe, expect, it } from 'vitest';

import { publicPagePresentation } from '../components/PublicPageContent';
import { publicPages } from '../content/routes';

describe('secondary public information architecture', () => {
  it('keeps Open Sreadya as a hero action only on How it works', () => {
    for (const page of publicPages) {
      const route = page.slug.join('/');
      expect(publicPagePresentation(route).showOpenSreadya).toBe(route === 'how-it-works');
    }
  });

  it('separates legal, security and support routes from product presentation', () => {
    expect(publicPagePresentation('privacy').family).toBe('legal');
    expect(publicPagePresentation('privacy-policy').family).toBe('legal');
    expect(publicPagePresentation('terms').family).toBe('legal');

    expect(publicPagePresentation('security').family).toBe('security');
    expect(publicPagePresentation('security/report').family).toBe('security');
    expect(publicPagePresentation('security-report').family).toBe('security');

    for (const route of ['help', 'download', 'install/iphone', 'install/android', 'install/pwa', 'accessibility']) {
      expect(publicPagePresentation(route).family).toBe('support');
    }

    for (const route of ['features', 'how-it-works', 'cycle-tracking', 'predictions', 'reminders', 'insights', 'life-stages', 'doctor-reports', 'sync']) {
      expect(publicPagePresentation(route).family).toBe('product');
      expect(publicPagePresentation(route).showPrinciples).toBe(true);
    }
  });

  it('covers every configured public route with one deliberate presentation family', () => {
    const configured = new Set(publicPages.map((page) => page.slug.join('/')));
    expect(configured.size).toBe(publicPages.length);

    for (const route of configured) {
      expect(['product', 'legal', 'security', 'support']).toContain(publicPagePresentation(route).family);
    }
  });
});
