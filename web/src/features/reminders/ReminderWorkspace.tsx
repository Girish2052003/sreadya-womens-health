'use client';

import { StatusChip } from '../../components/ui/StatusChip';

export function ReminderWorkspace() {
  return (
    <section className="account-free-core" data-testid="reminder-workspace" aria-busy="true">
      <div className="account-free-core__status">
        <StatusChip tone="info">Opening encrypted local vault…</StatusChip>
        <span className="workspace-note">Account-free · local reminder policy · local authoritative data</span>
      </div>
    </section>
  );
}
