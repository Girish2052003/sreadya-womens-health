import 'package:flutter/material.dart';

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Privacy policy')),
      body: ListView(
        padding: const EdgeInsetsDirectional.fromSTEB(20, 16, 20, 32),
        children: const [
          Text(
            'Sreva Privacy Policy',
            style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800),
          ),
          SizedBox(height: 4),
          Text('Last updated: 17 September 2026'),
          SizedBox(height: 20),
          _PolicySection(
            title: 'The core rule',
            body:
                'Account-free Sreva and account-based Sreva are equal first-class experiences. Core health tools remain available without an account. Optional account continuity can synchronize client-encrypted data, but Sreva does not operate a readable reproductive-health database.',
          ),
          _PolicySection(
            title: 'Account-free and local core',
            body:
                'You can use Sreva without an account. Cycle tracking, logging, predictions, insights, reminders, reports, privacy controls and encrypted backup remain local-first core health features. Disabling sync does not disable local Sreva.',
          ),
          _PolicySection(
            title: 'Data Sreva can store locally',
            body:
                'Depending on what you choose to log, Sreva can store period dates and flow, symptoms, mood and pain, temperature, weight, exercise, water, medications and supplements, fertility observations, pregnancy or ovulation test observations, sexual-activity observations, private notes, app preferences, predictions and reminder settings.',
          ),
          _PolicySection(
            title: 'Account and encrypted continuity',
            body:
                'If you enable optional continuity, your health content is encrypted before leaving an authorized device. The synchronization service receives ciphertext, wrapped key or recovery material and only the minimum operational metadata needed for account and device authorization and synchronization. Sreva infrastructure does not possess the health-vault decryption key.',
          ),
          _PolicySection(
            title: 'Account recovery and trusted devices',
            body:
                'Account access and old-vault decryption are separate. If enabled for a release, email or SMS can help recover account identity but cannot by itself decrypt the old health vault. A trusted device can approve a new device, and the independent recovery key can restore old-vault continuity. Losing every trusted device and the recovery key can make the previous vault unrecoverable.',
          ),
          _PolicySection(
            title: 'Collection, diagnostics and analytics',
            body:
                'Sreva does not use advertising SDKs, behavioral analytics, remote session replay or developer health-payload telemetry. Sync infrastructure may process ciphertext and operational metadata, but it must not receive readable reproductive-health history.',
          ),
          _PolicySection(
            title: 'Health Connect and Apple Health',
            body:
                'Platform health integration is optional and permission-scoped. Sreva requests supported categories only after user action. Imported records keep source information to reduce duplicates. Platform health stores remain separate systems under their providers’ rules.',
          ),
          _PolicySection(
            title: 'Sharing, reports and backups',
            body:
                'A report, partner summary, QR code, CycleVault or other export leaves the app only after explicit user action. CycleVault is encrypted locally with a user-chosen passphrase and remains separate from account-continuity recovery.',
          ),
          _PolicySection(
            title: 'Retention and deletion',
            body:
                'Local records remain until you edit or delete them, wipe Sreva data, uninstall the app, or restore another validated backup. Account deletion removes server-side account and synchronized ciphertext state that Sreva controls. Sreva cannot remotely erase former device copies, screenshots, user-created export files or CycleVault backups; those copies must be deleted where they are stored.',
          ),
          _PolicySection(
            title: 'Email, SMS and other providers',
            body:
                'Email or SMS verification providers are used only if those channels are enabled for a release. If enabled, they may process contact and delivery metadata under their own terms. App stores, operating systems, platform health stores and user-selected share destinations are separate data flows.',
          ),
          _PolicySection(
            title: 'Security',
            body:
                'Sreva uses encrypted local storage, device-protected key storage where available, optional app locking, private notification modes, authenticated encrypted backup, reviewed E2EE continuity and release-time privacy and dependency checks. No security mechanism can make a lost or compromised device risk-free.',
          ),
          _PolicySection(
            title: 'Changes to this policy',
            body:
                'Material privacy changes require reviewed application and documentation updates. A sync-enabled release must keep this in-app policy, the public policy, Privacy Center and applicable store declarations aligned with the exact shipping behavior.',
          ),
          _PolicySection(
            title: 'Contact',
            body:
                'The current developer and publisher contact details are provided in Sreva’s official store listing when that distribution channel is active.',
          ),
        ],
      ),
    );
  }
}

class _PolicySection extends StatelessWidget {
  const _PolicySection({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 6),
          Text(body),
        ],
      ),
    );
  }
}
