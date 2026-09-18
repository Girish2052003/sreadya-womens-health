import { WorkspaceNav } from '../../../components/navigation/WorkspaceNav';
import { StatusChip } from '../../../components/ui/StatusChip';
import { DiagnosticsWorkspace } from '../../../features/diagnostics/DiagnosticsWorkspace';

export default function DiagnosticsPage() {
  return (
    <div className="workspace-shell">
      <WorkspaceNav active="more" />
      <main className="workspace-main">
        <header className="workspace-heading">
          <div>
            <p className="workspace-kicker">Private workspace</p>
            <h1>Diagnostics</h1>
            <p className="workspace-note">Generate and review a technical support report that is deliberately restricted to non-health operational state.</p>
          </div>
          <StatusChip tone="info">Sanitized</StatusChip>
        </header>
        <DiagnosticsWorkspace />
      </main>
    </div>
  );
}
