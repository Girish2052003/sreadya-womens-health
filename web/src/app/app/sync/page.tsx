import { WorkspacePageShell } from '../../../components/navigation/WorkspacePageShell';
import { SyncWorkspace } from '../../../features/sync/SyncWorkspace';

export default function Page() {
  return (
    <WorkspacePageShell
      titleKey="workspace.title.sync"
      noteKey="workspace.sync.note"
      statusKey="workspace.status.optionalEncryptedSync"
      statusTone="info"
    >
      <SyncWorkspace />
    </WorkspacePageShell>
  );
}
