import { WorkspaceNav } from '../../../components/navigation/WorkspaceNav';
import { StatusChip } from '../../../components/ui/StatusChip';
import { PredictionWorkspace } from '../../../features/predictions/PredictionWorkspace';

export default function PredictionsPage() {
  return (
    <div className="workspace-shell">
      <WorkspaceNav active="more" />
      <main className="workspace-main">
        <header className="workspace-heading">
          <div>
            <p className="workspace-kicker">Private workspace</p>
            <h1>Predictions</h1>
          </div>
          <StatusChip tone="success">Local-first</StatusChip>
        </header>
        <PredictionWorkspace />
      </main>
    </div>
  );
}
