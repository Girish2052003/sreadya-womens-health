import { WorkspaceNav } from '../../../components/navigation/WorkspaceNav';
import { StatusChip } from '../../../components/ui/StatusChip';
import { RecoveryWorkspace } from '../../../features/account/RecoveryWorkspace';

export default function RecoveryPage() {
  return (
    <div className="workspace-shell">
      <WorkspaceNav active="more" />
      <main className="workspace-main">
        <header className="workspace-heading">
          <div>
            <p className="workspace-kicker">Private workspace</p>
            <h1>Recovery</h1>
            <p className="workspace-note">Validate user-held recovery material locally and keep email/SMS account recovery separate from old-vault decryption.</p>
          </div>
          <StatusChip tone="warning">User-held key</StatusChip>
        </header>
        <RecoveryWorkspace />
      </main>
    </div>
  );
}
