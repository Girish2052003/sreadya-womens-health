import { WorkspacePageShell } from '../../../components/navigation/WorkspacePageShell';
import { AssistantWorkspace } from '../../../features/assistant/AssistantWorkspace';

export default function Page() {
  return (
    <WorkspacePageShell
      titleKey="workspace.title.assistant"
      noteKey="workspace.assistant.note"
      statusKey="workspace.status.localFirst"
      statusTone="success"
    >
      <AssistantWorkspace />
    </WorkspacePageShell>
  );
}
