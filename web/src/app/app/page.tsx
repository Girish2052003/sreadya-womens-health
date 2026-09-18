'use client';

import Link from 'next/link';

import { WorkspacePageShell } from '../../components/navigation/WorkspacePageShell';
import { useI18n } from '../../i18n/I18nProvider';

const links = [
  ['common.home', '/app/home'],
  ['common.today', '/app/today'],
  ['common.log', '/app/log'],
  ['common.calendar', '/app/calendar'],
  ['nav.workspace.allFeatures', '/app/more'],
] as const;

export default function AppLandingPage() {
  const { t } = useI18n();

  return (
    <WorkspacePageShell
      active="home"
      kickerKey="workspace.landing.kicker"
      titleKey="workspace.landing.title"
      noteKey="workspace.landing.note"
      statusKey="workspace.status.localFirst"
    >
      <div className="feature-hub__links">
        {links.map(([labelKey, href]) => (
          <Link className="feature-hub__link" href={href} key={href}><span>{t(labelKey)}</span><span>→</span></Link>
        ))}
      </div>
    </WorkspacePageShell>
  );
}
