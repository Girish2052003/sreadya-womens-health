import type { ReactNode } from 'react';

import { WorkspaceHeader } from '../../components/navigation/WorkspaceHeader';
import { WebAppLockGate } from '../../privacy/WebAppLockGate';

export default function WorkspaceLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <WebAppLockGate>
      <WorkspaceHeader />
      {children}
    </WebAppLockGate>
  );
}
