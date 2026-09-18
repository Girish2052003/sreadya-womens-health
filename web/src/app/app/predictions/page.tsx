import { WorkspacePageShell } from '../../../components/navigation/WorkspacePageShell';
import { PredictionWorkspace } from '../../../features/predictions/PredictionWorkspace';

export default function Page() {
  return (
    <WorkspacePageShell
      titleKey="workspace.title.predictions"
      statusKey="workspace.status.localFirst"
      statusTone="success"
    >
      <PredictionWorkspace />
    </WorkspacePageShell>
  );
}
