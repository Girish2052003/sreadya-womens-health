import { WorkspacePageShell } from '../../../components/navigation/WorkspacePageShell';
import { SettingsWorkspace } from '../../../features/settings/SettingsWorkspace';

export default function Page() {
  return (
    <WorkspacePageShell
      titleKey="workspace.title.settings"
      noteKey="workspace.settings.note"
      statusKey="workspace.status.localPreferences"
      statusTone="info"
    >
      <SettingsWorkspace />
    </WorkspacePageShell>
  );
}
