import { WorkspacePageShell } from '../../../components/navigation/WorkspacePageShell';
import { SharingWorkspace } from '../../../features/sharing/SharingWorkspace';

export default function Page() {
  return (
    <WorkspacePageShell
      titleKey="workspace.title.sharing"
      noteKey="workspace.sharing.note"
      statusKey="workspace.status.localFirst"
      statusTone="success"
    >
      <SharingWorkspace />
    </WorkspacePageShell>
  );
}
