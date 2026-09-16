import { notFound } from 'next/navigation';

import { WorkspaceNav } from '../../../components/navigation/WorkspaceNav';
import { Card } from '../../../components/ui/Card';
import { StatusChip } from '../../../components/ui/StatusChip';
import { VaultLocalOnlyPanel } from '../../../components/vault/VaultLocalOnlyPanel';
import { workspaceSections, workspaceTitles } from '../../../content/routes';

export function generateStaticParams() {
  return workspaceSections.map((section) => ({ section }));
}

function activeKey(section: string) {
  if (section === 'home' || section === 'today' || section === 'log' || section === 'calendar') return section;
  return 'more';
}

export default async function WorkspaceSection({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!workspaceSections.includes(section as (typeof workspaceSections)[number])) notFound();
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
        {key === 'vault' ? <VaultLocalOnlyPanel /> : null}
        <div className="workspace-grid">
          <Card eyebrow="Sreva" title={title}>
            <p>This workspace is ready for the capability implementation assigned to this route.</p>
            <p className="workspace-note">Core health functions remain available without an account.</p>
          </Card>
          <Card eyebrow="Privacy boundary" title="Your device stays authoritative">
            <p>Sreva keeps local health work separate from optional continuity and never treats telemetry as a requirement.</p>
          </Card>
        </div>
      </main>
    </div>
  );
}
