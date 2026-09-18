import { WorkspacePageShell } from '../../../components/navigation/WorkspacePageShell';
import { ReminderWorkspace } from '../../../features/reminders/ReminderWorkspace';

export default function Page() {
  return (
    <WorkspacePageShell
      titleKey="workspace.title.reminders"
      noteKey="workspace.reminders.note"
      statusKey="workspace.status.localFirst"
      statusTone="success"
    >
      <ReminderWorkspace />
    </WorkspacePageShell>
  );
}
