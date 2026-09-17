import { WorkspaceNav } from '../../../components/navigation/WorkspaceNav';
import { Card } from '../../../components/ui/Card';
import { StatusChip } from '../../../components/ui/StatusChip';

export default function AccountPage() {
  return (
    <div className="workspace-shell">
      <WorkspaceNav active="more" />
      <main className="workspace-main">
        <header className="workspace-heading">
          <div>
            <p className="workspace-kicker">Private workspace</p>
            <h1>Account</h1>
            <p className="workspace-note">
              Account mode is optional. Local cycle tracking, predictions, insights, reports and reminders do not require a Sreva account.
            </p>
          </div>
          <StatusChip tone="info">Optional continuity</StatusChip>
        </header>

        <div className="workspace-grid">
          <Card eyebrow="Continuity" title="Passkey account access">
            <p>Use a passkey to authenticate the account boundary. A passkey identifies the account; it does not replace the vault secret held by trusted devices or the recovery key.</p>
          </Card>
          <Card eyebrow="Deletion" title="Delete server account">
            <p>Deleting the account removes Sreva server state and its encrypted continuity records. It cannot erase copies that already exist on former devices, and Sreva never claims a remote wipe of those devices.</p>
          </Card>
        </div>
      </main>
    </div>
  );
}
