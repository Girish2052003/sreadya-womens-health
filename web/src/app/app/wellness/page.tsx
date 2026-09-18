import { WorkspacePageShell } from '../../../components/navigation/WorkspacePageShell';
import { WellnessWorkspace } from '../../../features/logging/WellnessWorkspace';

export default function Page() {
  return (
    <WorkspacePageShell
      titleKey="workspace.title.wellness"
      noteKey="workspace.wellness.note"
      statusKey="workspace.status.localFirst"
      statusTone="success"
    >
      <WellnessWorkspace />
    </WorkspacePageShell>
  );
}
