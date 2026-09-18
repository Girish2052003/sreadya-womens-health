'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { useI18n } from '../../i18n/I18nProvider';

function fallbackSectionLabel(pathname: string): string {
  const part = pathname.split('/').filter(Boolean).at(-1) ?? 'home';
  return part
    .split('-')
    .map((piece) => piece ? piece[0].toUpperCase() + piece.slice(1) : piece)
    .join(' ');
}

export function WorkspaceHeader() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const part = pathname.split('/').filter(Boolean).at(-1) ?? 'home';
  const label = t(`workspace.title.${part}`, {}, fallbackSectionLabel(pathname));

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/app/more');
  };

  return (
    <header className="workspace-topbar" aria-label="Workspace controls">
      <button className="workspace-topbar__back" type="button" onClick={goBack} aria-label={t('common.back')}>
        <span aria-hidden="true">←</span>
        <span>{t('common.back')}</span>
      </button>
      <Link className="workspace-topbar__brand" href="/app/home" aria-label={t('nav.workspace.homeAria')}>
        <span className="workspace-topbar__mark" aria-hidden="true">S</span>
        <span>{t('brand.name')}</span>
      </Link>
      <span className="workspace-topbar__section" aria-live="polite">{label}</span>
      <Link className="workspace-topbar__all" href="/app/more">{t('nav.workspace.allFeatures')}</Link>
    </header>
  );
}
