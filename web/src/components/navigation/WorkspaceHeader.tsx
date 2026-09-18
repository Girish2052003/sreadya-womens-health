'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

function sectionLabel(pathname: string): string {
  const part = pathname.split('/').filter(Boolean).at(-1) ?? 'home';
  return part
    .split('-')
    .map((piece) => piece ? piece[0].toUpperCase() + piece.slice(1) : piece)
    .join(' ');
}

export function WorkspaceHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const label = sectionLabel(pathname);

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/app/more');
  };

  return (
    <header className="workspace-topbar" aria-label="Workspace controls">
      <button className="workspace-topbar__back" type="button" onClick={goBack} aria-label="Back">
        <span aria-hidden="true">←</span>
        <span>Back</span>
      </button>
      <Link className="workspace-topbar__brand" href="/app/home" aria-label="Sreadya workspace home">
        <span className="workspace-topbar__mark" aria-hidden="true">S</span>
        <span>Sreadya</span>
      </Link>
      <span className="workspace-topbar__section" aria-live="polite">{label}</span>
      <Link className="workspace-topbar__all" href="/app/more">All features</Link>
    </header>
  );
}
