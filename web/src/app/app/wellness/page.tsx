import { WorkspaceNav } from '../../../components/navigation/WorkspaceNav';
import { StatusChip } from '../../../components/ui/StatusChip';
import { WellnessWorkspace } from '../../../features/logging/WellnessWorkspace';

export default function WellnessPage() {
  return (
    <div className="workspace-shell">
      <WorkspaceNav active="more" />
      <main className="workspace-main">
        <header className="workspace-heading">
          <div>
            <p className="workspace-kicker">Private workspace</p>
            <h1>Wellness</h1>
            <p className="workspace-note">Record mood, sleep, energy, stress, hydration and other daily context in the encrypted local vault.</p>
          </div>
          <StatusChip tone="success">Local-first</StatusChip>
        </header>
        <WellnessWorkspace />
      </main>
    </div>
  );
}
