import { WorkspaceNav } from '../../../components/navigation/WorkspaceNav';
import { Card } from '../../../components/ui/Card';
import { StatusChip } from '../../../components/ui/StatusChip';

export default function RecoveryPage() {
  return (
    <div className="workspace-shell">
      <WorkspaceNav active="more" />
      <main className="workspace-main">
        <header className="workspace-heading">
          <div>
            <p className="workspace-kicker">Private workspace</p>
            <h1>Recovery</h1>
            <p className="workspace-note">
              The Sreva recovery key is user-held and can restore access to the wrapped vault secret when no trusted device is available.
            </p>
          </div>
          <StatusChip tone="warning">User-held key</StatusChip>
        </header>

        <div className="workspace-grid">
          <Card eyebrow="Emergency recovery" title="Recovery key restores vault access">
            <p>Account authentication plus the user-held recovery key can recover the encrypted vault wrapper. Sreva stores only ciphertext recovery material.</p>
          </Card>
          <Card eyebrow="Boundary" title="Email or SMS is not a vault key">
            <p>Email or SMS can help with account identity workflows, but Email or SMS alone cannot unlock old vault ciphertext and cannot replace the recovery key.</p>
          </Card>
        </div>
      </main>
    </div>
  );
}
