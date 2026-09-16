import { WorkspaceNav } from '../../../components/navigation/WorkspaceNav';
import { StatusChip } from '../../../components/ui/StatusChip';
import { AssistantWorkspace } from '../../../features/assistant/AssistantWorkspace';

export default function AssistantPage() {
  return (
    <div className="workspace-shell">
      <WorkspaceNav active="more" />
      <main className="workspace-main">
        <header className="workspace-heading">
          <div>
            <p className="workspace-kicker">Private workspace</p>
            <h1>Assistant</h1>
            <p className="workspace-note">Understand supported health commands locally and require confirmation before any mutation is saved.</p>
          </div>
          <StatusChip tone="success">Local-first</StatusChip>
        </header>
        <AssistantWorkspace />
      </main>
    </div>
  );
}
