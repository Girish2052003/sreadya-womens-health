'use client';

import { usePathname } from 'next/navigation';

import { useI18n } from '../i18n/I18nProvider';

export function EasyLanguageGuide() {
  const { t } = useI18n();
  const pathname = usePathname();
  const section = pathname.split('/').filter(Boolean).at(-1) ?? 'home';
  const guidance = t(`easyGuide.${section}`, {}, t('easyGuide.default'));

  return (
    <aside className="easy-language-guide" aria-label={t('easyGuide.aria')}>
      <strong>{t('easyGuide.title')}</strong>
      <span>{guidance}</span>
    </aside>
  );
}
