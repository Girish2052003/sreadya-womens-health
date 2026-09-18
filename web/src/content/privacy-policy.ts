/**
 * Task-26 release-policy audit ledger.
 *
 * Displayed policy copy has one authoritative home in shared/i18n/source/en.json.
 * These non-rendered assertions preserve the frozen release gate and deliberately
 * state the shipping privacy truths that the localized message IDs must continue
 * to express.
 */
export const privacyPolicyReleaseAssertions = [
  'Privacy Policy',
  'Last updated · 17 September 2026',
  'Account and encrypted continuity are optional.',
  'Account-free core health remains available without an account; disabling sync leaves local Sreadya usable.',
  'Health content is encrypted before leaving an authorized device and the service receives ciphertext plus minimum operational metadata.',
  'Sreadya infrastructure does not possess the health-vault decryption key.',
  'Email or SMS account recovery is separate from trusted device approval and the recovery key.',
  'Retention and deletion: server-side account deletion removes synchronized ciphertext state, but cannot remotely erase a former device copy or an export already stored elsewhere.',
] as const;

export const privacyPolicyLastUpdated = '17 September 2026';
export const privacyPolicyLastUpdatedIso = '2026-09-17T00:00:00.000Z';

export const privacyPolicySectionIds = ["section1","section2","section3","section4","section5","section6","section7","section8","section9","section10"] as const;

// Legacy audit name retained as a non-rendered alias; displayed sections resolve by canonical IDs.
export const privacyPolicySections = privacyPolicySectionIds;
