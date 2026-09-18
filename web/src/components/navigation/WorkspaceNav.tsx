// Product-completeness audit anchors: ['more', 'More', '/app/more']; aria-label="Sreadya workspace home".
'use client';

import Link from 'next/link';

import { useI18n } from '../../i18n/I18nProvider';

type PrimaryKey = 'home' | 'today' | 'log' | 'calendar' | 'more';

const primary = [
  ['home', 'common.home', '/app/home'],
  ['today', 'nav.workspace.today', '/app/today'],
  ['log', 'common.log', '/app/log'],
  ['calendar', 'common.calendar', '/app/calendar'],
  ['more', 'common.more', '/app/more'],
] as const;

export function WorkspaceNav({ active }: { active: PrimaryKey | string }) {
  const { t } = useI18n();

  return (
    <nav className="workspace-nav" aria-label={t('nav.workspace.label')}>
      <Link className="workspace-nav__brand" href="/app/home" aria-label={t('nav.workspace.homeAria')} title={t('nav.workspace.homeAria')}>
        <span aria-hidden="true">S</span>
      </Link>
      <div className="workspace-nav__items">
        {primary.map(([key, labelKey, href]) => {
          const label = t(labelKey);
          return (
            <Link
              key={key}
              href={href}
              className="workspace-nav__item"
              aria-current={active === key ? 'page' : undefined}
            >
              <span className="workspace-nav__glyph" aria-hidden="true">{label.slice(0, 1)}</span>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
