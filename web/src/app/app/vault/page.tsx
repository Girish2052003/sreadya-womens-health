import { WorkspaceNav } from '../../../components/navigation/WorkspaceNav';
import { StatusChip } from '../../../components/ui/StatusChip';
import { CycleVaultWorkspace } from '../../../features/vault/CycleVaultWorkspace';

export default function VaultPage() {
  return (
    <div className="workspace-shell">
      <WorkspaceNav active="more" />
      <main className="workspace-main">
        <header className="workspace-heading">
          <div>
            <p className="workspace-kicker">Private workspace</p>
            <h1>Vault</h1>
            <p className="workspace-note">
              Protect local health history and create or restore the interoperable CycleVault recovery format without sending the recovery file or passphrase to Sreva.
            </p>
          </div>
          <StatusChip tone="success">Local-first</StatusChip>
        </header>
        <CycleVaultWorkspace />
      </main>
    </div>
  );
}
