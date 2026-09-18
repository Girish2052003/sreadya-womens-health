import Link from 'next/link';

import { WorkspaceNav } from '../../../components/navigation/WorkspaceNav';
import { StatusChip } from '../../../components/ui/StatusChip';

const groups = [
  {
    title: 'Track & understand',
    links: [
      ['Cycle & periods', '/app/cycle'],
      ['Predictions', '/app/predictions'],
      ['Reminders', '/app/reminders'],
      ['Symptoms', '/app/symptoms'],
      ['Wellness', '/app/wellness'],
      ['Medication', '/app/medication'],
      ['Reproductive health', '/app/reproductive-health'],
      ['Life stage', '/app/life-stage'],
      ['Insights', '/app/insights'],
    ],
  },
  {
    title: 'Share & export',
    links: [
      ['Doctor reports', '/app/reports'],
      ['Private assistant', '/app/assistant'],
      ['Partner sharing', '/app/sharing'],
      ['Encrypted backup & restore', '/app/vault'],
    ],
  },
  {
    title: 'Continuity & recovery',
    links: [
      ['Encrypted sync', '/app/sync'],
      ['Trusted devices', '/app/devices'],
      ['Account', '/app/account'],
      ['Recovery', '/app/recovery'],
    ],
  },
  {
    title: 'Privacy & preferences',
    links: [
      ['Privacy Center', '/app/privacy'],
      ['Diagnostics', '/app/diagnostics'],
      ['Accessibility & settings', '/app/settings'],
    ],
  },
] as const;

export default function MorePage() {
  return (
    <div className="workspace-shell">
      <WorkspaceNav active="more" />
      <main className="workspace-main">
        <header className="workspace-heading">
          <div>
            <p className="workspace-kicker">Complete Sreadya</p>
            <h1>More</h1>
            <p className="workspace-note">Every production workspace has a home here. Nothing important is hidden behind an unlabelled control.</p>
          </div>
          <StatusChip tone="success">Feature hub</StatusChip>
        </header>
        <p className="feature-hub__intro">
          The five-item primary navigation stays calm for daily use. This hub is the complete map for cycle tracking,
          predictions, reminders, reproductive observations, reports, privacy, backup and optional encrypted continuity.
          <br /><Link className="workspace-text-link" href="/features">Browse the complete 258-ID capability catalogue</Link>
        </p>
        <div className="feature-hub__groups">
          {groups.map((group) => (
            <section className="feature-hub__group" key={group.title}>
              <h2>{group.title}</h2>
              <div className="feature-hub__links">
                {group.links.map(([label, href]) => (
                  <Link className="feature-hub__link" href={href} key={href}>
                    <span>{label}</span><span aria-hidden="true">→</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
