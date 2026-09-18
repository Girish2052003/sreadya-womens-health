import Link from 'next/link';

import { WorkspaceNav } from '../../components/navigation/WorkspaceNav';
import { StatusChip } from '../../components/ui/StatusChip';

export default function AppLandingPage() {
  return (
    <div className="workspace-shell">
      <WorkspaceNav active="home" />
      <main className="workspace-main">
        <header className="workspace-heading">
          <div>
            <p className="workspace-kicker">Private Sreva</p>
            <h1>Open your space</h1>
            <p className="workspace-note">Choose a starting point. Account-free health features remain first class.</p>
          </div>
          <StatusChip tone="success">Local-first</StatusChip>
        </header>
        <div className="feature-hub__links">
          {[
            ['Home', '/app/home'], ['Today', '/app/today'], ['Log', '/app/log'],
            ['Calendar', '/app/calendar'], ['All features', '/app/more'],
          ].map(([label, href]) => (
            <Link className="feature-hub__link" href={href} key={href}><span>{label}</span><span>→</span></Link>
          ))}
        </div>
      </main>
    </div>
  );
}
