import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final groups = <(String, List<(IconData, String, String, String)>)>[
      (
        'Everyday',
        [
          (
            Icons.alarm_outlined,
            'Reminders',
            '3-day period alerts, medicine and quiet hours',
            '/more/reminders',
          ),
          (
            Icons.chat_bubble_outline,
            'Private assistant',
            'Natural-language logging and offline voice',
            '/more/assistant',
          ),
          (
            Icons.favorite_border,
            'Life stage',
            'Cycle, TTC, pregnancy, postpartum and menopause',
            '/more/life-stage',
          ),
        ],
      ),
      (
        'Health & sharing',
        [
          (
            Icons.health_and_safety_outlined,
            'Apple Health / Health Connect',
            'Explicit, granular integration only',
            '/more/health',
          ),
          (
            Icons.description_outlined,
            'Doctor report',
            'Generate and preview PDF/CSV entirely on this device',
            '/more/reports',
          ),
          (
            Icons.people_outline,
            'Partner sharing',
            'Share only what you intentionally select',
            '/more/partner',
          ),
        ],
      ),
      (
        'Continuity',
        [
          (
            Icons.person_outline,
            'Account & continuity',
            'Optional identity for encrypted cross-device continuity',
            '/more/account',
          ),
          (
            Icons.sync_lock_outlined,
            'Encrypted sync',
            'Pause, resume or disable optional encrypted continuity',
            '/more/sync',
          ),
          (
            Icons.devices_outlined,
            'Trusted devices',
            'Review device access and validate enrollment requests',
            '/more/devices',
          ),
          (
            Icons.key_outlined,
            'Recovery',
            'Verify an emergency vault-recovery package locally',
            '/more/recovery',
          ),
        ],
      ),
      (
        'Privacy & resilience',
        [
          (
            Icons.lock_outline,
            'Privacy Center',
            'App lock, notification privacy and data location',
            '/more/privacy',
          ),
          (
            Icons.pin_outlined,
            'Sreadya PIN',
            'Optional local PIN fallback; no plaintext PIN storage',
            '/more/pin',
          ),
          (
            Icons.backup_outlined,
            'CycleVault',
            'Encrypted user-controlled backup and restore',
            '/more/backup',
          ),
          (
            Icons.build_circle_outlined,
            'Diagnostics',
            'Operational report with no health payload',
            '/more/diagnostics',
          ),
          (
            Icons.settings_outlined,
            'Settings & accessibility',
            'Language-ready, theme and display preferences',
            '/more/settings',
          ),
        ],
      ),
    ];
    return Scaffold(
      appBar: AppBar(title: const Text('More')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Card(
            child: ListTile(
              leading: Icon(Icons.shield_outlined),
              title: Text('Local Sovereign Core'),
              subtitle: Text(
                'Your reproductive-health data stays in Sreadya’s encrypted vault on this device.',
              ),
            ),
          ),
          const SizedBox(height: 16),
          for (final group in groups) ...[
            Text(
              group.$1,
              style: Theme.of(context).textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            Card(
              child: Column(
                children: group.$2
                    .map(
                      (item) => ListTile(
                        leading: Icon(item.$1),
                        title: Text(item.$2),
                        subtitle: Text(item.$3),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => context.push(item.$4),
                      ),
                    )
                    .toList(),
              ),
            ),
            const SizedBox(height: 16),
          ],
        ],
      ),
    );
  }
}
