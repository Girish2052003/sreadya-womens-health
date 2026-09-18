import { WorkspacePageShell } from '../../../components/navigation/WorkspacePageShell';
import { SymptomsWorkspace } from '../../../features/logging/SymptomsWorkspace';

export default function Page() {
  return (
    <WorkspacePageShell
      titleKey="workspace.title.symptoms"
      noteKey="workspace.symptoms.note"
      statusKey="workspace.status.localFirst"
      statusTone="success"
    >
      <SymptomsWorkspace />
    </WorkspacePageShell>
  );
}
