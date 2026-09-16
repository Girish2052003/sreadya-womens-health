import { WorkspaceNav } from '../../../components/navigation/WorkspaceNav';
import { StatusChip } from '../../../components/ui/StatusChip';
import { ReportsWorkspace } from '../../../features/reports/ReportsWorkspace';

export default function ReportsPage() {
  return (
    <div className="workspace-shell">
      <WorkspaceNav active="more" />
      <main className="workspace-main">
        <header className="workspace-heading">
          <div>
            <p className="workspace-kicker">Private workspace</p>
            <h1>Reports</h1>
            <p className="workspace-note">Build and preview a doctor report locally, then choose exactly what leaves your device.</p>
          </div>
          <StatusChip tone="success">Local-first</StatusChip>
        </header>
        <ReportsWorkspace />
      </main>
    </div>
  );
}
