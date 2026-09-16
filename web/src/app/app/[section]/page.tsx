import { notFound } from 'next/navigation';

import { WorkspaceNav } from '../../../components/navigation/WorkspaceNav';
import { Card } from '../../../components/ui/Card';
import { StatusChip } from '../../../components/ui/StatusChip';
import { VaultLocalOnlyPanel } from '../../../components/vault/VaultLocalOnlyPanel';
import { workspaceSections, workspaceTitles } from '../../../content/routes';
import { AccountFreeWorkspace } from '../../../features/core/AccountFreeWorkspace';

const TASK10_CORE_SECTIONS = ['home', 'today', 'log', 'calendar', 'cycle'] as const;
type Task10CoreSection = (typeof TASK10_CORE_SECTIONS)[number];
const DEDICATED_WORKSPACE_SECTIONS = new Set(['predictions', 'reminders']);

export function generateStaticParams() {
  return workspaceSections
    .filter((section) => !DEDICATED_WORKSPACE_SECTIONS.has(section))
    .map((section) => ({ section }));
}

function activeKey(section: string) {
  if (section === 'home' || section === 'today' || section === 'log' || section === 'calendar') return section;
  return 'more';
}

function isTask10CoreSection(section: string): section is Task10CoreSection {
  return (TASK10_CORE_SECTIONS as readonly string[]).includes(section);
}

export default async function WorkspaceSection({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!workspaceSections.includes(section as (typeof workspaceSections)[number])) notFound();
  if (DEDICATED_WORKSPACE_SECTIONS.has(section)) notFound();
  const key = section as (typeof workspaceSections)[number];
  const title = workspaceTitles[key];

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

        {isTask10CoreSection(key) ? <AccountFreeWorkspace section={key} /> : null}
        {key === 'vault' ? <VaultLocalOnlyPanel /> : null}

        {!isTask10CoreSection(key) && key !== 'vault' ? (
          <div className="workspace-grid">
            <Card eyebrow="Sreva" title={title}>
              <p>This workspace is ready for the capability implementation assigned to this route.</p>
              <p className="workspace-note">Core health functions remain available without an account.</p>
            </Card>
            <Card eyebrow="Privacy boundary" title="Your device stays authoritative">
              <p>Sreva keeps local health work separate from optional continuity and never treats telemetry as a requirement.</p>
            </Card>
          </div>
        ) : null}
      </main>
    </div>
  );
}
