import { WorkspaceNav } from '../../../components/navigation/WorkspaceNav';
import { StatusChip } from '../../../components/ui/StatusChip';
import { InsightsWorkspace } from '../../../features/insights/InsightsWorkspace';

export default function InsightsPage() {
  return (
    <div className="workspace-shell">
      <WorkspaceNav active="more" />
      <main className="workspace-main">
        <header className="workspace-heading">
          <div>
            <p className="workspace-kicker">Private workspace</p>
            <h1>Insights</h1>
            <p className="workspace-note">Read observational patterns from your local history with visible provenance and no diagnostic claims.</p>
          </div>
          <StatusChip tone="success">Local-first</StatusChip>
        </header>
        <InsightsWorkspace />
      </main>
    </div>
  );
}
