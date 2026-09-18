import { WorkspacePageShell } from '../../../components/navigation/WorkspacePageShell';
import { AccountWorkspace } from '../../../features/account/AccountWorkspace';

export default function Page() {
  return (
    <WorkspacePageShell
      titleKey="workspace.title.account"
      noteKey="workspace.account.note"
      statusKey="workspace.status.optionalContinuity"
      statusTone="info"
    >
      <AccountWorkspace />
    </WorkspacePageShell>
  );
}
