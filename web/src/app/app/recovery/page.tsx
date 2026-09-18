import { WorkspacePageShell } from '../../../components/navigation/WorkspacePageShell';
import { RecoveryWorkspace } from '../../../features/account/RecoveryWorkspace';

export default function Page() {
  return (
    <WorkspacePageShell
      titleKey="workspace.title.recovery"
      noteKey="workspace.recovery.note"
      statusKey="workspace.status.userHeldKey"
      statusTone="warning"
    >
      <RecoveryWorkspace />
    </WorkspacePageShell>
  );
}
