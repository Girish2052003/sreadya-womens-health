'use client';

import type { ReactNode } from 'react';

import { useI18n } from '../../i18n/I18nProvider';
import { WorkspaceNav } from './WorkspaceNav';
import { StatusChip, type StatusTone } from '../ui/StatusChip';

export function WorkspacePageShell({
  children,
  titleKey,
  noteKey,
  statusKey = 'workspace.status.localFirst',
  statusTone = 'success',
  active = 'more',
  kickerKey = 'workspace.privateKicker',
}: {
  children: ReactNode;
  titleKey: string;
  noteKey?: string;
  statusKey?: string;
  statusTone?: StatusTone;
  active?: string;
  kickerKey?: string;
}) {
  const { t } = useI18n();

  return (
    <div className="workspace-shell">
      <WorkspaceNav active={active} />
      <main className="workspace-main">
        <header className="workspace-heading">
          <div>
            <p className="workspace-kicker">{t(kickerKey)}</p>
            <h1>{t(titleKey)}</h1>
            {noteKey ? <p className="workspace-note">{t(noteKey)}</p> : null}
          </div>
          <StatusChip tone={statusTone}>{t(statusKey)}</StatusChip>
        </header>
        {children}
      </main>
    </div>
  );
}
