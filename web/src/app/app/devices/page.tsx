import { WorkspacePageShell } from '../../../components/navigation/WorkspacePageShell';
import { DevicesWorkspace } from '../../../features/account/DevicesWorkspace';

export default function Page() {
  return (
    <WorkspacePageShell
      titleKey="workspace.title.devices"
      noteKey="workspace.devices.note"
      statusKey="workspace.status.trustedDevices"
      statusTone="info"
    >
      <DevicesWorkspace />
    </WorkspacePageShell>
  );
}
