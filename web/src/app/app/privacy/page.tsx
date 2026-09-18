import { WorkspacePageShell } from '../../../components/navigation/WorkspacePageShell';
import { PrivacyWorkspace } from '../../../features/privacy/PrivacyWorkspace';

export default function Page() {
  return (
    <WorkspacePageShell
      titleKey="workspace.title.privacy"
      noteKey="workspace.privacy.note"
      statusKey="workspace.status.localFirst"
      statusTone="success"
    >
      <PrivacyWorkspace />
    </WorkspacePageShell>
  );
}
