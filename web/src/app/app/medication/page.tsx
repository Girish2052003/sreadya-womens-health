import { WorkspaceNav } from '../../../components/navigation/WorkspaceNav';
import { StatusChip } from '../../../components/ui/StatusChip';
import { MedicationWorkspace } from '../../../features/logging/MedicationWorkspace';

export default function MedicationPage() {
  return (
    <div className="workspace-shell">
      <WorkspaceNav active="more" />
      <main className="workspace-main">
        <header className="workspace-heading">
          <div>
            <p className="workspace-kicker">Private workspace</p>
            <h1>Medication</h1>
            <p className="workspace-note">Keep a private personal record of medication, supplements and contraception context without making prescribing claims.</p>
          </div>
          <StatusChip tone="success">Local-first</StatusChip>
        </header>
        <MedicationWorkspace />
      </main>
    </div>
  );
}
