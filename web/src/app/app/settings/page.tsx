import { WorkspaceNav } from '../../../components/navigation/WorkspaceNav';
import { StatusChip } from '../../../components/ui/StatusChip';
import { SettingsWorkspace } from '../../../features/settings/SettingsWorkspace';

export default function SettingsPage() {
  return (
    <div className="workspace-shell">
      <WorkspaceNav active="more" />
      <main className="workspace-main">
        <header className="workspace-heading">
          <div>
            <p className="workspace-kicker">Private workspace</p>
            <h1>Settings</h1>
            <p className="workspace-note">Appearance, formatting, accessibility, reminders, privacy, backup, continuity and support live in one organized settings area.</p>
          </div>
          <StatusChip tone="info">Local preferences</StatusChip>
        </header>
        <SettingsWorkspace />
      </main>
    </div>
  );
}
