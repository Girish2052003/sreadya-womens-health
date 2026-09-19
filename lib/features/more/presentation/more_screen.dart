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
            'Cycle alerts, medicine reminders and quiet hours',
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
            'Optional, explicit and category-by-category access',
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
            'Review first, then share — no Contacts access',
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
            'Theme, display, time and unit preferences',
            '/more/settings',
          ),
        ],
      ),
    ];

    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          const SliverAppBar.large(title: Text('More')),
          SliverPadding(
            padding: const EdgeInsetsDirectional.fromSTEB(16, 0, 16, 28),
            sliver: SliverList.list(
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        scheme.primaryContainer,
                        scheme.surfaceContainerHighest,
                      ],
                    ),
                    borderRadius: BorderRadius.circular(26),
                  ),
                  child: const Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.shield_outlined, size: 30),
                      SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Your private Sreadya space',
                              style: TextStyle(
                                fontWeight: FontWeight.w900,
                                fontSize: 18,
                              ),
                            ),
                            SizedBox(height: 6),
                            Text(
                              'Core reproductive-health data stays in Sreadya’s encrypted vault on this device. Open only the tools you want to use.',
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                for (final group in groups) ...[
                  Padding(
                    padding: const EdgeInsetsDirectional.only(start: 4),
                    child: Text(
                      group.$1,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                        color: scheme.primary,
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Card(
                    clipBehavior: Clip.antiAlias,
                    child: Column(
                      children: [
                        for (
                          var index = 0;
                          index < group.$2.length;
                          index++
                        ) ...[
                          _MoreTile(item: group.$2[index]),
                          if (index != group.$2.length - 1)
                            const Divider(height: 1, indent: 72),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 22),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MoreTile extends StatelessWidget {
  const _MoreTile({required this.item});

  final (IconData, String, String, String) item;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ListTile(
      minTileHeight: 76,
      contentPadding: const EdgeInsetsDirectional.fromSTEB(14, 8, 12, 8),
      leading: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: scheme.primaryContainer,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Icon(item.$1, color: scheme.onPrimaryContainer),
      ),
      title: Text(item.$2, style: const TextStyle(fontWeight: FontWeight.w800)),
      subtitle: Padding(
        padding: const EdgeInsets.only(top: 3),
        child: Text(item.$3),
      ),
      trailing: const Icon(Icons.chevron_right_rounded),
      onTap: () => context.push(item.$4),
    );
  }
}
