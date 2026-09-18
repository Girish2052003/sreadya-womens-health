'use client';
import Link from 'next/link';
import { useEffect,useState } from 'react';
import { AccessibilityPreferencesWorkspace } from '../../accessibility/AccessibilityPreferencesWorkspace';
import { useI18n } from '../../i18n/I18nProvider';
import { currentLanguageChoice } from '../../i18n/locale-registry';
import { applyThemePreference,GENERAL_SETTINGS_KEY } from '../../theme/theme-preference';
import { AppLockSettings } from '../../privacy/AppLockSettings';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
type Preferences={theme:'system'|'light'|'dark';units:'metric'|'imperial';time:'system'|'12h'|'24h';locale:string};
const KEY=GENERAL_SETTINGS_KEY,defaults:Preferences={theme:'system',units:'metric',time:'system',locale:'en'};
function applyTheme(theme:Preferences['theme']){applyThemePreference(document.documentElement,theme,window.matchMedia('(prefers-color-scheme: dark)').matches);}
function applyGeneralPreferences(p:Preferences){applyTheme(p.theme);document.documentElement.setAttribute('data-sreadya-units',p.units);document.documentElement.setAttribute('data-sreadya-time-format',p.time);}
export function SettingsWorkspace(){
 const {t,locale}=useI18n();const[preferences,setPreferences]=useState<Preferences>({...defaults,locale}),[saved,setSaved]=useState(false);
 useEffect(()=>{try{const raw=localStorage.getItem(KEY),parsed=raw?JSON.parse(raw) as Partial<Preferences>:{};const next:Preferences={theme:parsed.theme==='dark'||parsed.theme==='light'||parsed.theme==='system'?parsed.theme:defaults.theme,units:parsed.units==='imperial'?'imperial':'metric',time:parsed.time==='12h'||parsed.time==='24h'||parsed.time==='system'?parsed.time:'system',locale};setPreferences(next);applyGeneralPreferences(next);}catch{const next={...defaults,locale};setPreferences(next);applyGeneralPreferences(next);}},[locale]);
 const save=()=>{let current:Record<string,unknown>={};try{const raw=localStorage.getItem(KEY);current=raw?JSON.parse(raw):{};}catch{}localStorage.setItem(KEY,JSON.stringify({...current,theme:preferences.theme,units:preferences.units,time:preferences.time,locale}));applyGeneralPreferences(preferences);setSaved(true);};
 const language=currentLanguageChoice(locale);
 return <><div className="workspace-grid"><Card eyebrow={t('settings.generalEyebrow')} title={t('settings.generalTitle')}><div className="settings-grid">
 <label><span>{t('settings.appearance')}</span><select value={preferences.theme} onChange={e=>{setPreferences({...preferences,theme:e.target.value as Preferences['theme']});setSaved(false);}}><option value="system">{t('settings.followSystem')}</option><option value="light">{t('settings.light')}</option><option value="dark">{t('settings.dark')}</option></select></label>
 <label><span>{t('settings.units')}</span><select value={preferences.units} onChange={e=>{setPreferences({...preferences,units:e.target.value as Preferences['units']});setSaved(false);}}><option value="metric">{t('settings.metric')}</option><option value="imperial">{t('settings.imperial')}</option></select></label>
 <label><span>{t('settings.time')}</span><select value={preferences.time} onChange={e=>{setPreferences({...preferences,time:e.target.value as Preferences['time']});setSaved(false);}}><option value="system">{t('settings.followLocale')}</option><option value="12h">{t('settings.12h')}</option><option value="24h">{t('settings.24h')}</option></select></label>
 <div className="settings-language-summary"><span>{t('settings.language')}</span><strong>{language.flag} {language.nativeName}</strong><small>{t('settings.languageHomeOnly')}</small></div>
 </div><div className="continuity-actions"><Button onClick={save}>{t('settings.save')}</Button></div>{saved?<p role="status" className="workspace-note">{t('settings.saved')}</p>:null}</Card>
 <Card eyebrow={t('settings.controlsEyebrow')} title={t('settings.controlsTitle')}><div className="settings-links"><Link href="/app/reminders">{t('settings.notifications')}</Link><Link href="/app/privacy">{t('settings.privacyCenter')}</Link><Link href="/app/vault">{t('settings.backup')}</Link><Link href="/app/sync">{t('settings.sync')}</Link><Link href="/app/devices">{t('settings.devices')}</Link><Link href="/app/account">{t('settings.account')}</Link><Link href="/app/diagnostics">{t('settings.diagnostics')}</Link><Link href="/help">{t('settings.help')}</Link></div><p className="workspace-note">{t('settings.nativeBoundary')}</p></Card></div><div style={{marginTop:16}}><AppLockSettings/></div><div style={{marginTop:16}}><AccessibilityPreferencesWorkspace/></div></>;
}
