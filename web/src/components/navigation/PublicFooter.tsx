'use client';

import Link from 'next/link';

import { useI18n } from '../../i18n/I18nProvider';

export function PublicFooter() {
  const { t } = useI18n();

  return (
    <footer className="public-footer">
      <div>
        <strong>{t('brand.name')}</strong>
        <p>{t('footer.tagline')}</p>
      </div>
      <div className="public-footer__links" aria-label={t('footer.links')}>
        <Link href="/privacy-policy">{t('footer.privacyPolicy')}</Link>
        <Link href="/terms">{t('footer.terms')}</Link>
        <Link href="/security/report">{t('footer.security')}</Link>
      </div>
      <div className="forge-lockup" aria-label={t('footer.provenance')}>
        <span>FORGE</span>
        <small>by NC CORP</small>
      </div>
    </footer>
  );
}
