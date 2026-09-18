import { WorkspacePageShell } from '../../../components/navigation/WorkspacePageShell';
import { InsightsWorkspace } from '../../../features/insights/InsightsWorkspace';

export default function Page() {
  return (
    <WorkspacePageShell
      titleKey="workspace.title.insights"
      noteKey="workspace.insights.note"
      statusKey="workspace.status.localFirst"
      statusTone="success"
    >
      <InsightsWorkspace />
    </WorkspacePageShell>
  );
}
