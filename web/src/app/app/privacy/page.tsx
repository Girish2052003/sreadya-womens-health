import { WorkspaceNav } from '../../../components/navigation/WorkspaceNav';
import { StatusChip } from '../../../components/ui/StatusChip';
import { PrivacyWorkspace } from '../../../features/privacy/PrivacyWorkspace';

export default function PrivacyPage() {
  return (
    <div className="workspace-shell">
      <WorkspaceNav active="more" />
      <main className="workspace-main">
        <header className="workspace-heading">
          <div>
            <p className="workspace-kicker">Private workspace</p>
            <h1>Privacy</h1>
            <p className="workspace-note">See what this Web client actually protects today, including explicit limits for sync and browser-controlled protections.</p>
          </div>
          <StatusChip tone="success">Local-first</StatusChip>
        </header>
        <PrivacyWorkspace />
      </main>
    </div>
  );
}
