'use client';

import Link from 'next/link';

import { WorkspacePageShell } from '../../../components/navigation/WorkspacePageShell';
import { useI18n } from '../../../i18n/I18nProvider';

const groups = [
  {
    titleKey: 'workspace.more.group.track',
    links: [
      ['workspace.more.cycle', '/app/cycle'],
      ['workspace.title.predictions', '/app/predictions'],
      ['workspace.title.reminders', '/app/reminders'],
      ['workspace.title.symptoms', '/app/symptoms'],
      ['workspace.title.wellness', '/app/wellness'],
      ['workspace.title.medication', '/app/medication'],
      ['workspace.title.reproductive-health', '/app/reproductive-health'],
      ['workspace.title.life-stage', '/app/life-stage'],
      ['workspace.title.insights', '/app/insights'],
    ],
  },
  {
    titleKey: 'workspace.more.group.share',
    links: [
      ['workspace.more.doctorReports', '/app/reports'],
      ['workspace.more.privateAssistant', '/app/assistant'],
      ['workspace.more.partnerSharing', '/app/sharing'],
      ['workspace.more.backup', '/app/vault'],
    ],
  },
  {
    titleKey: 'workspace.more.group.continuity',
    links: [
      ['workspace.more.encryptedSync', '/app/sync'],
      ['workspace.more.trustedDevices', '/app/devices'],
      ['workspace.title.account', '/app/account'],
      ['workspace.title.recovery', '/app/recovery'],
    ],
  },
  {
    titleKey: 'workspace.more.group.privacy',
    links: [
      ['workspace.more.privacyCenter', '/app/privacy'],
      ['workspace.title.diagnostics', '/app/diagnostics'],
      ['workspace.more.accessibilitySettings', '/app/settings'],
    ],
  },
] as const;

export default function MorePage() {
  const { t } = useI18n();

  return (
    <WorkspacePageShell
      kickerKey="workspace.more.kicker"
      titleKey="workspace.title.more"
      noteKey="workspace.more.note"
      statusKey="workspace.more.status"
      statusTone="success"
    >
      <p className="feature-hub__intro">
        {t('workspace.more.intro')}
      </p>
      <div className="feature-hub__groups">
        {groups.map((group) => (
          <section className="feature-hub__group" key={group.titleKey}>
            <h2>{t(group.titleKey)}</h2>
            <div className="feature-hub__links">
              {group.links.map(([labelKey, href]) => (
                <Link className="feature-hub__link" href={href} key={href}>
                  <span>{t(labelKey)}</span><span aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </WorkspacePageShell>
  );
}
