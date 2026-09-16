import { WorkspaceNav } from '../../../components/navigation/WorkspaceNav';
import { StatusChip } from '../../../components/ui/StatusChip';
import { ReminderWorkspace } from '../../../features/reminders/ReminderWorkspace';

export default function RemindersPage() {
  return (
    <div className="workspace-shell">
      <WorkspaceNav active="more" />
      <main className="workspace-main">
        <header className="workspace-heading">
          <div>
            <p className="workspace-kicker">Private workspace</p>
            <h1>Reminders</h1>
            <p className="workspace-note">
              Configure cycle-relative reminders locally. Sreva reports what this browser can actually deliver and does not promise background delivery that the platform cannot provide.
            </p>
          </div>
          <StatusChip tone="success">Local-first</StatusChip>
        </header>
        <ReminderWorkspace />
      </main>
    </div>
  );
}
