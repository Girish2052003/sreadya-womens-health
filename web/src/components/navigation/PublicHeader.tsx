'use client';

import Link from 'next/link';

import { useI18n } from '../../i18n/I18nProvider';
import { ThemeToggle } from '../../theme/ThemeToggle';
import { LanguageChooser } from './LanguageChooser';

const publicLinks = [
  ['nav.public.features', '/features'],
  ['nav.public.how', '/how-it-works'],
  ['nav.public.privacy', '/privacy'],
  ['nav.public.security', '/security'],
  ['nav.public.help', '/help'],
  ['nav.public.download', '/download'],
] as const;

export function PublicHeader({ showLanguageChooser = false }: { showLanguageChooser?: boolean }) {
  const { t, availableLocales } = useI18n();

  return (
    <header className="public-header">
      <Link className="public-header__brand" href="/" aria-label={t('brand.homeAria')} title={t('brand.homeAria')}>
        <span className="public-header__mark" aria-hidden="true">S</span>
        <span>{t('brand.name')}</span>
      </Link>
      <nav className="public-header__nav" aria-label={t('nav.public.label')}>
        {publicLinks.map(([labelKey, href]) => (
          <Link key={href} href={href}>{t(labelKey)}</Link>
        ))}
      </nav>
      {showLanguageChooser && availableLocales.length > 1 ? <LanguageChooser /> : null}
      <ThemeToggle />
      <Link className="public-header__cta" href="/app/home">{t('common.openSreadya')}</Link>
      <nav className="public-header__mobile-nav" aria-label={t('nav.public.label')}>
        {publicLinks.map(([labelKey, href]) => (
          <Link key={href} href={href}>{t(labelKey)}</Link>
        ))}
      </nav>
    </header>
  );
}
