import { WorkspaceNav } from '../../../components/navigation/WorkspaceNav';
import { StatusChip } from '../../../components/ui/StatusChip';
import { SyncWorkspace } from '../../../features/sync/SyncWorkspace';

export default function SyncPage() {
  return (
    <div className="workspace-shell">
      <WorkspaceNav active="more" />
      <main className="workspace-main">
        <header className="workspace-heading">
          <div>
            <p className="workspace-kicker">Private workspace</p>
            <h1>Sync</h1>
            <p className="workspace-note">Inspect and control the local encrypted sync queue while keeping account-free Sreva fully operational.</p>
          </div>
          <StatusChip tone="info">Optional encrypted sync</StatusChip>
        </header>
        <SyncWorkspace />
      </main>
    </div>
  );
}
