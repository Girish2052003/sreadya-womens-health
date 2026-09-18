import { WorkspacePageShell } from '../../../components/navigation/WorkspacePageShell';
import { MedicationWorkspace } from '../../../features/logging/MedicationWorkspace';

export default function Page() {
  return (
    <WorkspacePageShell
      titleKey="workspace.title.medication"
      noteKey="workspace.medication.note"
      statusKey="workspace.status.localFirst"
      statusTone="success"
    >
      <MedicationWorkspace />
    </WorkspacePageShell>
  );
}
