import { WorkspaceNav } from '../../../components/navigation/WorkspaceNav';
import { StatusChip } from '../../../components/ui/StatusChip';
import { SharingWorkspace } from '../../../features/sharing/SharingWorkspace';

export default function SharingPage() {
  return (
    <div className="workspace-shell">
      <WorkspaceNav active="more" />
      <main className="workspace-main">
        <header className="workspace-heading">
          <div>
            <p className="workspace-kicker">Private workspace</p>
            <h1>Sharing</h1>
            <p className="workspace-note">Preview a granular local summary before sharing it; sensitive categories stay outside the sharing contract.</p>
          </div>
          <StatusChip tone="success">Local-first</StatusChip>
        </header>
        <SharingWorkspace />
      </main>
    </div>
  );
}
