import { WorkspaceNav } from '../../../components/navigation/WorkspaceNav';
import { StatusChip } from '../../../components/ui/StatusChip';
import { SymptomsWorkspace } from '../../../features/logging/SymptomsWorkspace';

export default function SymptomsPage() {
  return (
    <div className="workspace-shell">
      <WorkspaceNav active="more" />
      <main className="workspace-main">
        <header className="workspace-heading">
          <div>
            <p className="workspace-kicker">Private workspace</p>
            <h1>Symptoms</h1>
            <p className="workspace-note">Track optional symptoms with structured severity and context while keeping medical boundaries explicit.</p>
          </div>
          <StatusChip tone="success">Local-first</StatusChip>
        </header>
        <SymptomsWorkspace />
      </main>
    </div>
  );
}
