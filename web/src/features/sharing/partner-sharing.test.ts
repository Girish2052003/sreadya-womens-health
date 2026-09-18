import { describe, expect, it } from 'vitest';

import {
  PARTNER_CAPABILITY_IDS,
  PARTNER_SHARE_CATEGORIES,
  buildPartnerSharePackage,
  createPartnerGrant,
  revokePartnerGrant,
  type PartnerShareCopy,
} from './partner-sharing';

const copy: PartnerShareCopy = {
  title: 'Sreadya shared summary',
  footer: 'Shared intentionally by the Sreadya user.',
  labels: {
    prediction: 'Expected period window',
    cyclePhase: 'Cycle phase / cycle day',
    selectedReminder: 'One selected reminder',
    selectedWellness: 'Selected wellness summary',
  },
  formatRow: (label, value) => `${label}: ${value}`,
};

describe('Task 13 partner sharing baseline', () => {
  it('covers PART-001 through PART-010 with only the approved V1 categories', () => {
    expect(PARTNER_CAPABILITY_IDS).toEqual([
      'PART-001', 'PART-002', 'PART-003', 'PART-004', 'PART-005',
      'PART-006', 'PART-007', 'PART-008', 'PART-009', 'PART-010',
    ]);
    expect(PARTNER_SHARE_CATEGORIES).toEqual([
      'prediction', 'cyclePhase', 'selectedReminder', 'selectedWellness',
    ]);
  });

  it('builds localized summary/QR/share payload from exactly the granted categories', () => {
    const grant = createPartnerGrant({
      id: 'grant-1',
      categories: ['prediction', 'selectedWellness'],
      createdAt: '2026-09-16T17:00:00.000Z',
    });
    const share = buildPartnerSharePackage({
      grant,
      copy,
      predictionWindow: '20 Sep – 24 Sep',
      cyclePhase: 'cycle day 12',
      selectedReminder: '22 Sep 08:00',
      selectedWellness: 'energy, sleep',
    });

    expect(share.summary).toBe([
      'Sreadya shared summary',
      'Expected period window: 20 Sep – 24 Sep',
      'Selected wellness summary: energy, sleep',
      'Shared intentionally by the Sreadya user.',
    ].join('\n'));
    expect(share.qrPayload).toBe(share.summary);
    expect(share.shareText).toBe(share.summary);
    expect(share.summary).not.toContain('cycle day 12');
    expect(share.summary).not.toContain('22 Sep 08:00');
  });

  it('makes sensitive reproductive categories structurally unavailable', () => {
    expect(PARTNER_SHARE_CATEGORIES).not.toContain('sexualActivity');
    expect(PARTNER_SHARE_CATEGORIES).not.toContain('privateNotes');
    expect(PARTNER_SHARE_CATEGORIES).not.toContain('fertilityTests');
    expect(PARTNER_SHARE_CATEGORIES).not.toContain('pregnancyData');
  });

  it('revokes a local grant immediately while keeping domain errors language-neutral', () => {
    const grant = createPartnerGrant({
      id: 'grant-2',
      categories: ['cyclePhase'],
      createdAt: '2026-09-16T17:00:00.000Z',
    });
    const revoked = revokePartnerGrant(grant, '2026-09-16T17:05:00.000Z');

    expect(revoked.revokedAt).toBe('2026-09-16T17:05:00.000Z');
    expect(() => buildPartnerSharePackage({ grant: revoked, copy, cyclePhase: 'cycle day 8' }))
      .toThrow('partner_grant_revoked');
  });
});
