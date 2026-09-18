import { WorkspaceNav } from '../../../components/navigation/WorkspaceNav';
import { StatusChip } from '../../../components/ui/StatusChip';
import { AccountWorkspace } from '../../../features/account/AccountWorkspace';

export default function AccountPage() {
  return (
    <div className="workspace-shell">
      <WorkspaceNav active="more" />
      <main className="workspace-main">
        <header className="workspace-heading">
          <div>
            <p className="workspace-kicker">Private workspace</p>
            <h1>Account</h1>
            <p className="workspace-note">Account mode is optional and adds continuity only; local health features remain complete without it.</p>
          </div>
          <StatusChip tone="info">Optional continuity</StatusChip>
        </header>
        <AccountWorkspace />
      </main>
    </div>
  );
}
