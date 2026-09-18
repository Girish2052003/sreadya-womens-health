import type { ReactNode } from 'react';

import { WorkspaceHeader } from '../../components/navigation/WorkspaceHeader';

export default function WorkspaceLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <WorkspaceHeader />
      {children}
    </>
  );
}
