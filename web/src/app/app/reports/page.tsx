import { WorkspacePageShell } from '../../../components/navigation/WorkspacePageShell';
import { ReportsWorkspace } from '../../../features/reports/ReportsWorkspace';

export default function Page() {
  return (
    <WorkspacePageShell
      titleKey="workspace.title.reports"
      noteKey="workspace.reports.note"
      statusKey="workspace.status.localFirst"
      statusTone="success"
    >
      <ReportsWorkspace />
    </WorkspacePageShell>
  );
}
