'use client';

import Link from 'next/link';

import { CapabilityCatalogue } from './CapabilityCatalogue';
import { PublicTopicContent } from './PublicTopicContent';
import { PublicFooter } from './navigation/PublicFooter';
import { PublicHeader } from './navigation/PublicHeader';
import { InstallGuide, type InstallGuideTarget } from './pwa/InstallGuide';
import { privacyPolicyLastUpdatedIso, privacyPolicySectionIds } from '../content/privacy-policy';
import { formatLocaleDate } from '../i18n/locale';
import { useI18n } from '../i18n/I18nProvider';

export function PublicPageContent({
  topicKey,
  titleKey,
  eyebrowKey,
  summaryKey,
  installTarget,
  isPrivacyPolicy,
  isFeatures,
}: {
  topicKey: string;
  titleKey: string;
  eyebrowKey: string;
  summaryKey: string;
  installTarget: InstallGuideTarget | null;
  isPrivacyPolicy: boolean;
  isFeatures: boolean;
}) {
  const { t, locale } = useI18n();

  return (
    <div className="public-site">
      <PublicHeader />
      <main className="public-page">
        <section className="public-page__hero">
          <p className="public-eyebrow">{t(eyebrowKey)}</p>
          <h1>{t(titleKey)}</h1>
          <p className="public-lede">{t(summaryKey)}</p>
          <div className="public-page__actions">
            <Link className="link-button link-button--primary" href="/app/home">{t('publicPage.open')}</Link>
            <Link className="link-button link-button--quiet" href="/how-it-works">{t('publicPage.how')}</Link>
          </div>
        </section>
        {isFeatures ? <CapabilityCatalogue /> : null}
        <PublicTopicContent topicKey={topicKey} />
        {installTarget ? <InstallGuide target={installTarget} /> : null}
        {isPrivacyPolicy ? (
          <section className="policy-document" aria-label={t('publicPage.policyAria')}>
            <p className="public-eyebrow">{t('privacyPolicy.lastUpdated')}: {formatLocaleDate(privacyPolicyLastUpdatedIso, locale, 'UTC')}</p>
            <p className="public-lede">{t('privacyPolicy.intro')}</p>
            {privacyPolicySectionIds.map((id) => (
              <article key={id}>
                <h2>{t(`privacyPolicy.${id}.title`)}</h2>
                <p>{t(`privacyPolicy.${id}.body`)}</p>
              </article>
            ))}
          </section>
        ) : null}
        <section className="principle-grid" aria-label={t('publicPage.principlesAria')}>
          <article><span>01</span><h2>{t('publicPage.principle1.title')}</h2><p>{t('publicPage.principle1.body')}</p></article>
          <article><span>02</span><h2>{t('publicPage.principle2.title')}</h2><p>{t('publicPage.principle2.body')}</p></article>
          <article><span>03</span><h2>{t('publicPage.principle3.title')}</h2><p>{t('publicPage.principle3.body')}</p></article>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
