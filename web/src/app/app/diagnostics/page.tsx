import { WorkspacePageShell } from '../../../components/navigation/WorkspacePageShell';
import { DiagnosticsWorkspace } from '../../../features/diagnostics/DiagnosticsWorkspace';

export default function Page() {
  return (
    <WorkspacePageShell
      titleKey="workspace.title.diagnostics"
      noteKey="workspace.diagnostics.note"
      statusKey="workspace.status.sanitized"
      statusTone="info"
    >
      <DiagnosticsWorkspace />
    </WorkspacePageShell>
  );
}
