export type PrivacyPolicySection = {
  title: string;
  body: string;
};

export const privacyPolicyLastUpdatedLabel = 'Last updated';
export const privacyPolicyLastUpdated = '17 September 2026';

export const privacyPolicyIntro =
  'Sreva Privacy Policy. Account-free Sreva and account-based Sreva are equal first-class experiences. Core health tools remain available without an account, while optional end-to-end encrypted continuity adds cross-device convenience without creating a developer-readable reproductive-health database.';

export const privacyPolicySections: PrivacyPolicySection[] = [
  {
    title: 'Account-free and local core',
    body: 'You can use Sreva without an account. Cycle tracking, logging, predictions, insights, reminders, reports, privacy controls and encrypted backup remain local-first core health features. Disabling sync does not disable local Sreva.',
  },
  {
    title: 'Account and encrypted continuity',
    body: 'If you enable optional continuity, your health content is encrypted before leaving an authorized device. The synchronization service receives ciphertext, wrapped key or recovery material and only the minimum operational metadata needed for account/device authorization and synchronization. Sreva infrastructure does not possess the health-vault decryption key.',
  },
  {
    title: 'Minimum operational metadata',
    body: 'Operational metadata can include opaque account, device, vault, object or event identifiers, ciphertext size, protocol/version counters, synchronization timestamps, public device-verification material, and authorization or revocation state. It does not authorize the service to receive readable period dates, symptoms, sexual activity, fertility observations, pregnancy state, medication details, private notes, prediction inputs or report contents.',
  },
  {
    title: 'Account recovery and trusted devices',
    body: 'Account access and old-vault decryption are separate. Where a release enables verified email or SMS recovery, email or SMS can help recover account identity but cannot by itself decrypt the old health vault. A trusted device can approve a new device, while the independent recovery key can restore vault continuity. Losing every trusted device and the recovery key can make the previous vault unrecoverable.',
  },
  {
    title: 'Retention and deletion',
    body: 'Local records remain until you edit or delete them, wipe Sreva data, uninstall the client, or replace them with a validated restore. Account deletion removes server-side account and synchronized ciphertext state controlled by Sreva. Sreva cannot remotely erase former device copies, screenshots, user-created export files, CycleVault backups or data already sent to another destination; those copies must be deleted where they are stored.',
  },
  {
    title: 'Sharing, reports and backups',
    body: 'Reports, partner summaries, QR codes, CycleVault backups and other exports leave Sreva only after explicit user action. CycleVault uses a user-held backup passphrase and remains separate from account-continuity recovery.',
  },
  {
    title: 'Health integrations',
    body: 'Health Connect and Apple Health are optional, permission-scoped integrations. Their platform stores remain separate systems under their providers’ rules, and permissions can be revoked through the operating system.',
  },
  {
    title: 'Diagnostics and analytics',
    body: 'Sreva does not use advertising SDKs, behavioral analytics, remote session replay or developer health-payload telemetry. Diagnostics are limited to reviewed operational status and must not contain readable reproductive-health payloads.',
  },
  {
    title: 'Email, SMS and external providers',
    body: 'Email or SMS verification providers are used only if those channels are enabled for a release. If enabled, they may process contact and delivery metadata under their own terms. App stores, operating systems, notification services, platform health stores and destinations chosen by the user are separate data flows.',
  },
  {
    title: 'Policy and release truth',
    body: 'A sync-enabled release must keep this policy, in-product privacy information and applicable store declarations aligned with the exact shipping behavior. Repository tests do not claim that an external store-console submission or production provider account has been completed.',
  },
];
