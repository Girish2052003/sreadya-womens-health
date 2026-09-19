'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { useI18n } from '../i18n/I18nProvider';

const featureGroups = [
  {
    titleKey: 'workspace.more.group.track',
    items: [
      ['workspace.more.cycle', '/app/cycle'],
      ['workspace.title.predictions', '/app/predictions'],
      ['workspace.title.symptoms', '/app/symptoms'],
      ['workspace.title.wellness', '/app/wellness'],
      ['workspace.title.medication', '/app/medication'],
      ['workspace.title.reproductive-health', '/app/reproductive-health'],
      ['workspace.title.life-stage', '/app/life-stage'],
      ['workspace.title.insights', '/app/insights'],
    ],
  },
  {
    titleKey: 'workspace.more.group.share',
    items: [
      ['workspace.title.home', '/app/home'],
      ['workspace.title.today', '/app/today'],
      ['workspace.title.log', '/app/log'],
      ['workspace.title.calendar', '/app/calendar'],
      ['workspace.title.reminders', '/app/reminders'],
      ['workspace.more.doctorReports', '/app/reports'],
      ['workspace.more.privateAssistant', '/app/assistant'],
      ['workspace.more.partnerSharing', '/app/sharing'],
    ],
  },
  {
    titleKey: 'workspace.more.group.continuity',
    items: [
      ['workspace.more.backup', '/app/vault'],
      ['workspace.more.encryptedSync', '/app/sync'],
      ['workspace.more.trustedDevices', '/app/devices'],
      ['workspace.title.account', '/app/account'],
      ['workspace.title.recovery', '/app/recovery'],
    ],
  },
  {
    titleKey: 'workspace.more.group.privacy',
    items: [
      ['workspace.more.privacyCenter', '/app/privacy'],
      ['workspace.title.diagnostics', '/app/diagnostics'],
      ['workspace.more.accessibilitySettings', '/app/settings'],
    ],
  },
] as const;

export function CapabilityCatalogue() {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase();

  const groups = useMemo(
    () =>
      featureGroups
        .map((group) => ({
          ...group,
          items: group.items.filter(([labelKey]) => {
            if (!normalized) return true;
            return (
              t(labelKey).toLowerCase().includes(normalized) ||
              t(group.titleKey).toLowerCase().includes(normalized)
            );
          }),
        }))
        .filter((group) => group.items.length > 0),
    [normalized, t],
  );

  const count = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <section className="capability-catalogue" aria-labelledby="capability-catalogue-title">
      <p className="public-eyebrow">{t('catalogue.eyebrow')}</p>
      <h2 id="capability-catalogue-title">{t('catalogue.title')}</h2>
      <p className="public-lede">{t('catalogue.lede')}</p>

      <label className="core-field">
        <span>{t('catalogue.search')}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder={t('catalogue.searchHint')}
        />
      </label>
      <div aria-live="polite" className="workspace-note">
        {t('catalogue.showing', { count })}
      </div>

      {groups.map((group, index) => (
        <details key={group.titleKey} open={Boolean(normalized) || index < 2}>
          <summary>{t(group.titleKey)}</summary>
          <ul className="capability-catalogue__list">
            {group.items.map(([labelKey, href]) => (
              <li className="capability-catalogue__item" key={href} data-feature-route={href}>
                <strong>{t(labelKey)}</strong>
                <Link href={href}>{t('catalogue.surface.interaction')} →</Link>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </section>
  );
}
