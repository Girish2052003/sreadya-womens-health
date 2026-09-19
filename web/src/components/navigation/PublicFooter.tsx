'use client';

import Link from 'next/link';

import { useI18n } from '../../i18n/I18nProvider';

const footerLinks = [
  ['/privacy-policy', 'footer.privacyPolicy'],
  ['/terms', 'footer.terms'],
  ['/security/report', 'footer.security'],
] as const;

export function PublicFooter({ currentPath }: { currentPath?: string }) {
  const { t } = useI18n();

  return (
    <footer className="public-footer">
      <div>
        <strong>{t('brand.name')}</strong>
        <p>{t('footer.tagline')}</p>
      </div>
      <div className="public-footer__links" aria-label={t('footer.links')}>
        {footerLinks.map(([href, labelKey]) => (
          href === currentPath
            ? <span key={href} className="public-footer__current" aria-current="page">{t(labelKey)}</span>
            : <Link key={href} href={href}>{t(labelKey)}</Link>
        ))}
      </div>
      <div className="forge-lockup" aria-label={t('footer.provenance')}>
        <span>FORGE</span>
        <small>by NC CORP</small>
      </div>
    </footer>
  );
}
