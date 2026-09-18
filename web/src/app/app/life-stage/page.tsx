import { WorkspacePageShell } from '../../../components/navigation/WorkspacePageShell';
import { LifeStageWorkspace } from '../../../features/life-stage/LifeStageWorkspace';

export default function Page() {
  return (
    <WorkspacePageShell
      titleKey="workspace.title.life-stage"
      noteKey="workspace.life-stage.note"
      statusKey="workspace.status.localFirst"
      statusTone="success"
    >
      <LifeStageWorkspace />
    </WorkspacePageShell>
  );
}
