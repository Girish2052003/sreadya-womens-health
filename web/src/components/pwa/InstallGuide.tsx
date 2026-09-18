'use client';
import { useMemo } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { detectInstallCapability } from '../../pwa/install-capability';
import { StatusChip } from '../ui/StatusChip';
export type InstallGuideTarget='iphone'|'android'|'pwa';
export function InstallGuide({target}:{target:InstallGuideTarget}){
 const {t}=useI18n(),capability=useMemo(()=>detectInstallCapability(),[]);
 return <section className="install-guide" aria-labelledby={`install-${target}-title`}><div className="install-guide__topline"><p className="public-eyebrow">{t('install.eyebrow')}</p><StatusChip tone={capability.standalone?'success':'info'}>{capability.standalone?t('install.installed'):t('install.browser')}</StatusChip></div><h2 id={`install-${target}-title`}>{t(`install.${target}.title`)}</h2><ol>{[1,2,3].map(n=><li key={n}>{t(`install.${target}.step${n}`)}</li>)}</ol><aside className="install-guide__privacy"><strong>{t('install.privacyTitle')}</strong><p>{t('install.privacyBody')}</p></aside></section>;
}
