import { WorkspaceNav } from '../../../components/navigation/WorkspaceNav';
import { StatusChip } from '../../../components/ui/StatusChip';
import { LifeStageWorkspace } from '../../../features/life-stage/LifeStageWorkspace';

export default function LifeStagePage() {
  return (
    <div className="workspace-shell">
      <WorkspaceNav active="more" />
      <main className="workspace-main">
        <header className="workspace-heading">
          <div>
            <p className="workspace-kicker">Private workspace</p>
            <h1>Life Stage</h1>
            <p className="workspace-note">Adapt Sreva’s local context without deleting or rewriting your existing health history.</p>
          </div>
          <StatusChip tone="success">Local-first</StatusChip>
        </header>
        <LifeStageWorkspace />
      </main>
    </div>
  );
}
