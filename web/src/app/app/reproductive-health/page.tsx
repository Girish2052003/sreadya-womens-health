import { WorkspacePageShell } from '../../../components/navigation/WorkspacePageShell';
import { ReproductiveHealthWorkspace } from '../../../features/logging/ReproductiveHealthWorkspace';

export default function Page() {
  return (
    <WorkspacePageShell
      titleKey="workspace.title.reproductive-health"
      noteKey="workspace.reproductive-health.note"
      statusKey="workspace.status.localFirst"
      statusTone="success"
    >
      <ReproductiveHealthWorkspace />
    </WorkspacePageShell>
  );
}
