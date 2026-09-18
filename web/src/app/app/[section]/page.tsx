import { notFound } from 'next/navigation';

import { WorkspaceNav } from '../../../components/navigation/WorkspaceNav';
import { StatusChip } from '../../../components/ui/StatusChip';
import { workspaceSections, workspaceTitles } from '../../../content/routes';
import { AccountFreeWorkspace } from '../../../features/core/AccountFreeWorkspace';

const CORE_SECTIONS = ['home', 'today', 'log', 'calendar', 'cycle'] as const;
type CoreSection = (typeof CORE_SECTIONS)[number];

const DEDICATED_WORKSPACE_SECTIONS = new Set([
  'predictions', 'reminders', 'symptoms', 'wellness', 'medication', 'reproductive-health',
  'life-stage', 'insights', 'reports', 'assistant', 'sharing', 'privacy', 'vault',
  'sync', 'devices', 'account', 'recovery', 'diagnostics', 'settings', 'more',
]);

export function generateStaticParams() {
  return workspaceSections
    .filter((section) => !DEDICATED_WORKSPACE_SECTIONS.has(section))
    .map((section) => ({ section }));
}

function activeKey(section: string) {
  if (section === 'home' || section === 'today' || section === 'log' || section === 'calendar') return section;
  return 'more';
}

function isCoreSection(section: string): section is CoreSection {
  return (CORE_SECTIONS as readonly string[]).includes(section);
}

export default async function WorkspaceSection({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!workspaceSections.includes(section as (typeof workspaceSections)[number])) notFound();
  if (DEDICATED_WORKSPACE_SECTIONS.has(section)) notFound();
  if (!isCoreSection(section)) notFound();

  const title = workspaceTitles[section];

  return (
    <div className="workspace-shell">
      <WorkspaceNav active={activeKey(section)} />
      <main className="workspace-main">
        <header className="workspace-heading">
          <div>
            <p className="workspace-kicker">Private workspace</p>
            <h1>{title}</h1>
          </div>
          <StatusChip tone="success">Local-first</StatusChip>
        </header>
        <AccountFreeWorkspace section={section} />
      </main>
    </div>
  );
}
