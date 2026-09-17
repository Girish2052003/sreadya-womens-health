import { WorkspaceNav } from '../../../components/navigation/WorkspaceNav';
import { Card } from '../../../components/ui/Card';
import { StatusChip } from '../../../components/ui/StatusChip';

export default function DevicesPage() {
  return (
    <div className="workspace-shell">
      <WorkspaceNav active="more" />
      <main className="workspace-main">
        <header className="workspace-heading">
          <div>
            <p className="workspace-kicker">Private workspace</p>
            <h1>Devices</h1>
            <p className="workspace-note">
              A new device becomes trusted only after an already-active device approves it. Account authentication alone does not unlock the existing vault.
            </p>
          </div>
          <StatusChip tone="success">Trusted device</StatusChip>
        </header>

        <div className="workspace-grid">
          <Card eyebrow="Approval" title="Approve a new device">
            <p>An active trusted device can approve a pending device and authorize secure vault-key continuity for that device.</p>
          </Card>
          <Card eyebrow="Revocation" title="Stop future authorization">
            <p>A revoked device is blocked from future authenticated sync and continuity actions. Revocation does not remotely erase data already stored on that device.</p>
          </Card>
        </div>
      </main>
    </div>
  );
}
