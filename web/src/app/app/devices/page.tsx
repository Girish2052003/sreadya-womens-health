import { WorkspaceNav } from '../../../components/navigation/WorkspaceNav';
import { StatusChip } from '../../../components/ui/StatusChip';
import { DevicesWorkspace } from '../../../features/account/DevicesWorkspace';

export default function DevicesPage() {
  return (
    <div className="workspace-shell">
      <WorkspaceNav active="more" />
      <main className="workspace-main">
        <header className="workspace-heading">
          <div>
            <p className="workspace-kicker">Private workspace</p>
            <h1>Devices</h1>
            <p className="workspace-note">Review continuity device state and validate enrollment material without confusing account authentication with vault decryption.</p>
          </div>
          <StatusChip tone="info">Trusted devices</StatusChip>
        </header>
        <DevicesWorkspace />
      </main>
    </div>
  );
}
