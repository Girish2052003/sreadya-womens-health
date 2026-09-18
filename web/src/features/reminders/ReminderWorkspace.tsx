'use client';
import { useEffect,useRef,useState } from 'react';
import { StatusChip } from '../../components/ui/StatusChip';
import type { NotificationPrivacy,ReminderPolicySettings } from '../../domain/reminders/reminder-policy';
import { useI18n } from '../../i18n/I18nProvider';
import { detectNotificationCapability,type NotificationCapability } from '../../pwa/notification-capability';
import { DexieVaultPersistence } from '../../vault/db';
import { HealthVaultRepository } from '../../vault/health-repository';
import { VaultService } from '../../vault/vault-service';
import { continuePrivately } from '../onboarding/private-onboarding';
import { ReminderHealthPanel } from './ReminderHealthPanel';
import { PersonalReminderPanel } from './PersonalReminderPanel';
import { DEFAULT_REMINDER_SETTINGS,ReminderSettingsRepository } from './reminder-settings-repository';
import { prepareReminderSchedule,type PreparedReminderSchedule } from './reminder-service';
import { ReminderSettingsPanel } from './ReminderSettingsPanel';
type ReminderRuntime={vault:VaultService;healthRepository:HealthVaultRepository;settingsRepository:ReminderSettingsRepository};
function localWallClock(date=new Date()):string{return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}T${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}:${String(date.getSeconds()).padStart(2,'0')}`;}
function notificationPrivacy(value:string):NotificationPrivacy{return value==='balanced'||value==='detailed'?value:'maximum';}
function cloneDefaultSettings():ReminderPolicySettings{return{...DEFAULT_REMINDER_SETTINGS,enabledOffsetsDays:[]};}
const EMPTY_SCHEDULE:PreparedReminderSchedule={prediction:null,plans:[]};
export function ReminderWorkspace(){
 const {t}=useI18n(),runtimeRef=useRef<ReminderRuntime|null>(null);const[settings,setSettings]=useState<ReminderPolicySettings>(cloneDefaultSettings),[schedule,setSchedule]=useState<PreparedReminderSchedule>(EMPTY_SCHEDULE),[capability,setCapability]=useState<NotificationCapability>(()=>detectNotificationCapability('maximum')),[vaultStatus,setVaultStatus]=useState(()=>t('core.vault.opening')),[ready,setReady]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let cancelled=false;const vault=new VaultService(new DexieVaultPersistence());void(async()=>{await continuePrivately(vault);const healthRepository=new HealthVaultRepository(vault),settingsRepository=new ReminderSettingsRepository(vault),loaded=await settingsRepository.load(),prepared=await prepareReminderSchedule(healthRepository,loaded,localWallClock());if(cancelled)return;runtimeRef.current={vault,healthRepository,settingsRepository};setSettings(loaded);setSchedule(prepared);setCapability(detectNotificationCapability(notificationPrivacy(loaded.privacy)));setVaultStatus(t('core.vault.ready'));setReady(true);})().catch(()=>{if(cancelled)return;setVaultStatus(t('core.vault.unavailable'));setError(t('reminder.workspaceError'));setReady(true);});return()=>{cancelled=true;runtimeRef.current=null;vault.lock();};},[t]);
 const changeSettings=(next:ReminderPolicySettings)=>{setSettings(next);setCapability(detectNotificationCapability(notificationPrivacy(next.privacy)));};const saveSettings=async()=>{const runtime=runtimeRef.current;if(!runtime)return;setSaving(true);setError('');try{await runtime.settingsRepository.save(settings);const prepared=await prepareReminderSchedule(runtime.healthRepository,settings,localWallClock());setSchedule(prepared);setCapability(detectNotificationCapability(notificationPrivacy(settings.privacy)));setVaultStatus(t('core.saved'));}catch(cause){setError(t('reminder.workspaceSaveError'));}finally{setSaving(false);}};
 return <section className="account-free-core" data-testid="reminder-workspace" aria-busy={!ready}><div className="account-free-core__status"><StatusChip tone={error?'danger':ready?'success':'info'}>{vaultStatus}</StatusChip><span className="workspace-note">{t('reminder.workspaceStatus')}</span></div>{error?<p className="core-error" role="alert">{error}</p>:null}{ready&&!error?<><ReminderSettingsPanel settings={settings} saving={saving} onChange={changeSettings} onSave={()=>{void saveSettings();}}/><ReminderHealthPanel capability={capability} privacy={notificationPrivacy(settings.privacy)} nextReminder={schedule.plans[0]??null}/><PersonalReminderPanel/>{!schedule.prediction?<p className="workspace-note reminder-no-prediction">{t('reminder.needHistory')}</p>:null}</>:null}</section>;
}
