import { WorkspaceNav } from '../../../components/navigation/WorkspaceNav';
import { StatusChip } from '../../../components/ui/StatusChip';
import { ReproductiveHealthWorkspace } from '../../../features/logging/ReproductiveHealthWorkspace';

export default function ReproductiveHealthPage() {
  return (
    <div className="workspace-shell">
      <WorkspaceNav active="more" />
      <main className="workspace-main">
        <header className="workspace-heading">
          <div>
            <p className="workspace-kicker">Private workspace</p>
            <h1>Reproductive Health</h1>
            <p className="workspace-note">Optional fertility and reproductive observations stay private and are never presented as certified contraception guidance.</p>
          </div>
          <StatusChip tone="success">Local-first</StatusChip>
        </header>
        <ReproductiveHealthWorkspace />
      </main>
    </div>
  );
}
