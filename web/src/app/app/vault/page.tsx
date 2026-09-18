import { WorkspacePageShell } from '../../../components/navigation/WorkspacePageShell';
import { VaultLocalOnlyPanel } from '../../../components/vault/VaultLocalOnlyPanel';
import { CycleVaultWorkspace } from '../../../features/vault/CycleVaultWorkspace';

export default function VaultPage() {
  const vaultTestHarness = process.env.NEXT_PUBLIC_SREADYA_VAULT_TEST_HARNESS === '1';

  return (
    <WorkspacePageShell
      titleKey="workspace.title.vault"
      noteKey="workspace.vault.note"
      statusKey="workspace.status.localFirst"
      statusTone="success"
    >
      {vaultTestHarness ? <VaultLocalOnlyPanel /> : <CycleVaultWorkspace />}
    </WorkspacePageShell>
  );
}
