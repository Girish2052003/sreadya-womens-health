'use client';
import Link from 'next/link';
import { useEffect,useState } from 'react';
import { Card } from '../../components/ui/Card';
import { StatusChip } from '../../components/ui/StatusChip';
import type { NotificationPrivacy } from '../../domain/reminders/reminder-policy';
import { useI18n } from '../../i18n/I18nProvider';
import { isPinConfigured } from '../../privacy/app-lock';
import { DexieVaultPersistence } from '../../vault/db';
import { VaultService } from '../../vault/vault-service';
import { continuePrivately } from '../onboarding/private-onboarding';
import { ReminderSettingsRepository } from '../reminders/reminder-settings-repository';
import { buildWebPrivacyStatus,type WebPrivacyStatus } from './privacy-status';

function notificationPrivacy(value:string):NotificationPrivacy{return value==='balanced'||value==='detailed'?value:'maximum';}
export function PrivacyWorkspace(){
 const {t}=useI18n();const[privacy,setPrivacy]=useState<WebPrivacyStatus|null>(null),[vaultStatus,setVaultStatus]=useState(()=>t('core.vault.opening')),[ready,setReady]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let cancelled=false;const vault=new VaultService(new DexieVaultPersistence());void(async()=>{await continuePrivately(vault);const reminderSettings=await new ReminderSettingsRepository(vault).load();if(cancelled)return;setPrivacy(buildWebPrivacyStatus({notificationPrivacy:notificationPrivacy(reminderSettings.privacy),appLockConfigured:isPinConfigured(window.localStorage)}));setVaultStatus(t('core.vault.ready'));setReady(true);})().catch(()=>{if(cancelled)return;setVaultStatus(t('core.vault.unavailable'));setError(t('privacy.error'));setReady(true);});return()=>{cancelled=true;vault.lock();};},[t]);
 const statusKeys:Record<keyof WebPrivacyStatus,string>={healthDataLocation:'privacy.status.healthDataLocation',developerHealthDatabase:'privacy.status.developerHealthDatabase',behaviorAnalytics:'privacy.status.behaviorAnalytics',databaseProtection:'privacy.status.databaseProtection',platformHealthAccess:'privacy.status.platformHealthAccess',partnerLiveAccess:'privacy.status.partnerLiveAccess',sync:'privacy.status.sync',appLock:'privacy.status.appLock',appSwitcherProtection:'privacy.status.appSwitcherProtection',notificationPrivacy:'privacy.status.notificationPrivacy',advertisingProfile:'privacy.status.advertisingProfile'};
 return <section className="account-free-core" data-testid="privacy-workspace" aria-busy={!ready}><div className="account-free-core__status"><StatusChip tone={error?'danger':ready?'success':'info'}>{vaultStatus}</StatusChip><span className="workspace-note">{t('privacy.status')}</span></div>{error?<p className="core-error" role="alert">{error}</p>:null}
 {ready&&privacy?<div className="workspace-grid">
  <Card eyebrow={t('privacy.centerEyebrow')} title={t('privacy.centerTitle')}><dl className="privacy-status-list">{(Object.keys(statusKeys) as Array<keyof WebPrivacyStatus>).map(key=><div key={key} className="privacy-status-row"><dt>{t(statusKeys[key])}</dt><dd>{privacy[key]}</dd></div>)}</dl></Card>
  <Card eyebrow={t('privacy.controlsEyebrow')} title={t('privacy.controlsTitle')}><div className="settings-links"><Link href="/app/vault">{t('privacy.link.backup')}</Link><Link href="/app/devices">{t('privacy.link.devices')}</Link><Link href="/app/sharing">{t('privacy.link.sharing')}</Link><Link href="/app/account">{t('privacy.link.account')}</Link><Link href="/app/diagnostics">{t('privacy.link.diagnostics')}</Link><Link href="/app/reminders">{t('privacy.link.notifications')}</Link><Link href="/app/settings">{t('privacy.link.pin')}</Link></div></Card>
  <Card eyebrow={t('privacy.storageEyebrow')} title={t('privacy.storageTitle')}><p>{t('privacy.storage.health')}</p><p>{t('privacy.storage.preferences')}</p><p>{t('privacy.storage.sync')}</p><p>{t('privacy.storage.diagnostics')}</p></Card>
  <Card eyebrow={t('privacy.boundaryEyebrow')} title={t('privacy.boundaryTitle')}><p>{t('privacy.boundaryBody')}</p><p className="workspace-note">{t('privacy.boundaryNote')}</p></Card>
 </div>:null}</section>;
}
