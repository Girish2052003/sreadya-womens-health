import { WorkspaceNav } from '../../../components/navigation/WorkspaceNav';
import { Card } from '../../../components/ui/Card';
import { StatusChip } from '../../../components/ui/StatusChip';

export default function SyncPage() {
  return (
    <div className="workspace-shell">
      <WorkspaceNav active="more" />
      <main className="workspace-main">
        <header className="workspace-heading">
          <div>
            <p className="workspace-kicker">Private workspace</p>
            <h1>Sync</h1>
            <p className="workspace-note">
              Encrypted sync is optional. Sreva remains usable offline and without an account, and sync can be paused without deleting the local vault.
            </p>
          </div>
          <StatusChip tone="info">Optional encrypted sync</StatusChip>
        </header>

        <div className="workspace-grid">
          <Card eyebrow="Ciphertext continuity" title="Encrypted device continuity">
            <p>Only opaque identifiers, versions and encrypted envelopes cross the sync boundary; health payloads remain encrypted before upload.</p>
          </Card>
          <Card eyebrow="Control" title="Pause or disable sync">
            <p>You can pause encrypted sync while keeping local health data available on this device. Re-enabling continuity does not make account mode mandatory.</p>
          </Card>
        </div>
      </main>
    </div>
  );
}
