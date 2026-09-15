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
          Text('Last updated: 15 September 2026'),
          SizedBox(height: 20),
          _PolicySection(
            title: 'The core rule',
            body: 'Sreva is designed so that your reproductive-health history is not a developer-operated health database. Core cycle data, symptoms, notes, predictions, insights and reminder planning are stored or processed on your device.',
          ),
          _PolicySection(
            title: 'Data Sreva can store locally',
            body: 'Depending on what you choose to log, Sreva can store period dates and flow, symptoms, mood and pain, temperature, weight, exercise, water, medications and supplements, fertility observations, pregnancy or ovulation test observations, sexual-activity observations, private notes, app preferences, predictions and reminder settings. These records are optional unless needed for a feature you choose to use.',
          ),
          _PolicySection(
            title: 'How local health data is used',
            body: 'Sreva uses local records to show history, estimate future period timing, schedule local reminders, generate observational insights, create reports you request, and support local natural-language logging. Sreva v1 does not use this information to diagnose disease, make treatment decisions or claim contraceptive effectiveness.',
          ),
          _PolicySection(
            title: 'Developer collection and analytics',
            body: 'Sreva v1 does not send your reproductive-health records to a developer health server. The app includes no advertising SDK, behavioral analytics SDK, remote session replay or health-payload telemetry. App stores and operating-system services may independently process technical information under their own terms.',
          ),
          _PolicySection(
            title: 'Health Connect and Apple Health',
            body: 'Platform health integration is optional. Sreva requests access only after you choose it and only for supported categories required by the feature. Imported records keep source information to reduce duplicates. You can revoke platform permissions in operating-system settings. Platform health stores are integrations, not Sreva’s authoritative local database.',
          ),
          _PolicySection(
            title: 'Sharing and reports',
            body: 'Sreva shares nothing through its own developer server. A doctor report, partner summary, QR code or CycleVault leaves the app only after an explicit user action. Private categories are excluded from partner sharing and sensitive report categories require explicit selection.',
          ),
          _PolicySection(
            title: 'Backups',
            body: 'CycleVault backups are created and encrypted locally with a user-chosen recovery passphrase. Sreva does not hold a recovery copy or the recovery passphrase. You choose the destination through the operating system. Losing the passphrase can make a backup unrecoverable.',
          ),
          _PolicySection(
            title: 'Security',
            body: 'Sreva uses encrypted SQLite storage, device-protected key storage, optional app locking, private notification modes, sensitive-screen protections where supported, authenticated encrypted CycleVault backups, and release-time dependency and privacy checks. No security mechanism can make a lost or compromised device risk-free.',
          ),
          _PolicySection(
            title: 'Retention and deletion',
            body: 'Local records remain until you edit or delete them, wipe Sreva data, uninstall the app, or restore another validated backup. Individual observations and period records can be deleted. Privacy Center provides a full local-health-data wipe. Sreva has no developer health database from which deleted local records can be recovered.',
          ),
          _PolicySection(
            title: 'Diagnostics',
            body: 'User-generated diagnostic reports contain operational information such as app version, operating-system version, database schema, permission state and integrity status. They are designed not to include period dates, symptoms, notes, sexual activity, fertility history, pregnancy status or other health payloads.',
          ),
          _PolicySection(
            title: 'Changes to this policy',
            body: 'Material privacy changes must ship with a reviewed application update and corresponding store/privacy documentation. Sreva will not silently introduce a developer reproductive-health database while continuing to make the local-sovereign privacy promise.',
          ),
          _PolicySection(
            title: 'Contact',
            body: 'The current developer and publisher contact details are provided in Sreva’s official Google Play or App Store listing. Privacy and security questions can be sent using that verified store contact channel.',
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
