'use client';

import { useMemo } from 'react';

import { androidProductionRelease } from '../../content/android-release';
import { useI18n } from '../../i18n/I18nProvider';
import { detectInstallCapability } from '../../pwa/install-capability';
import { StatusChip } from '../ui/StatusChip';

export type InstallGuideTarget = 'iphone' | 'android' | 'pwa';

export function InstallGuide({ target }: { target: InstallGuideTarget }) {
  const { t } = useI18n();
  const capability = useMemo(() => detectInstallCapability(), []);

  if (target === 'android') {
    return (
      <section
        className="install-guide"
        aria-labelledby="install-android-title"
        data-release-version={androidProductionRelease.version}
      >
        <div className="install-guide__topline">
          <p className="public-eyebrow">{t('install.eyebrow')}</p>
          <StatusChip tone="success">{t('install.android.badge')}</StatusChip>
        </div>
        <h2 id="install-android-title">{t('install.android.title')}</h2>
        <div className="public-page__actions">
          <a
            className="link-button link-button--primary"
            href={androidProductionRelease.apkUrl}
          >
            {t('publicTopic.download.section2.action')}
          </a>
          <a
            className="link-button link-button--quiet"
            href={androidProductionRelease.checksumUrl}
          >
            {t('install.android.checksum')}
          </a>
        </div>
        <ol>
          {[1, 2, 3].map((n) => (
            <li key={n}>{t(`install.android.step${n}`)}</li>
          ))}
        </ol>
        <p>
          <a href={androidProductionRelease.releaseUrl}>
            {t('install.android.releaseDetails')}
          </a>
        </p>
        <aside className="install-guide__privacy">
          <strong>{t('install.privacyTitle')}</strong>
          <p>{t('install.privacyBody')}</p>
        </aside>
      </section>
    );
  }

  return (
    <section className="install-guide" aria-labelledby={`install-${target}-title`}>
      <div className="install-guide__topline">
        <p className="public-eyebrow">{t('install.eyebrow')}</p>
        <StatusChip tone={capability.standalone ? 'success' : 'info'}>
          {capability.standalone ? t('install.installed') : t('install.browser')}
        </StatusChip>
      </div>
      <h2 id={`install-${target}-title`}>{t(`install.${target}.title`)}</h2>
      <ol>
        {[1, 2, 3].map((n) => (
          <li key={n}>{t(`install.${target}.step${n}`)}</li>
        ))}
      </ol>
      <aside className="install-guide__privacy">
        <strong>{t('install.privacyTitle')}</strong>
        <p>{t('install.privacyBody')}</p>
      </aside>
    </section>
  );
}
