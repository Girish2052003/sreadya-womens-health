// Product-depth audit anchors: PIN; automatic lock.
'use client';
import { useEffect,useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useI18n } from '../i18n/I18nProvider';
import { getAutoLockMinutes,isPinConfigured,removePin,setAutoLockMinutes,setPin } from './app-lock';
import { SREADYA_APP_LOCK_CHANGE_EVENT } from './WebAppLockGate';
export function AppLockSettings(){
 const {t}=useI18n();const[configured,setConfigured]=useState(false),[pin,setPinValue]=useState(''),[confirm,setConfirm]=useState(''),[minutes,setMinutes]=useState(5),[status,setStatus]=useState(''),[error,setError]=useState('');
 useEffect(()=>{setConfigured(isPinConfigured(window.localStorage));setMinutes(getAutoLockMinutes(window.localStorage));},[]);
 const save=async()=>{setError('');setStatus('');if(pin!==confirm){setError(t('appLock.mismatch'));return;}try{await setPin(window.localStorage,pin,minutes);setConfigured(true);setPinValue('');setConfirm('');setStatus(t('appLock.saved'));window.dispatchEvent(new Event(SREADYA_APP_LOCK_CHANGE_EVENT));}catch(cause){setError(t('appLock.saveError'));}};
 const updateMinutes=(value:number)=>{setMinutes(value);if(configured){setAutoLockMinutes(window.localStorage,value);setStatus(t('appLock.updated'));}};const remove=()=>{removePin(window.localStorage);setConfigured(false);setStatus(t('appLock.removed'));window.dispatchEvent(new Event(SREADYA_APP_LOCK_CHANGE_EVENT));};
 return <Card eyebrow={t('appLock.eyebrow')} title={t('appLock.title')}><p>{t('appLock.body')}</p><div className="settings-grid"><label><span>{t('appLock.auto')}</span><select value={minutes} onChange={e=>updateMinutes(Number(e.currentTarget.value))}><option value="1">{t('appLock.after1')}</option><option value="5">{t('appLock.after5')}</option><option value="15">{t('appLock.after15')}</option><option value="30">{t('appLock.after30')}</option></select></label><label><span>{configured?t('appLock.newPin'):t('appLock.pin')}</span><input type="password" inputMode="numeric" pattern="[0-9]*" value={pin} onChange={e=>setPinValue(e.currentTarget.value)}/></label><label><span>{t('appLock.confirm')}</span><input type="password" inputMode="numeric" pattern="[0-9]*" value={confirm} onChange={e=>setConfirm(e.currentTarget.value)}/></label></div><div className="continuity-actions"><Button onClick={()=>{void save();}} disabled={pin.length<4||confirm.length<4}>{configured?t('appLock.change'):t('appLock.enable')}</Button>{configured?<Button variant="quiet" onClick={remove}>{t('appLock.remove')}</Button>:null}</div>{status?<p role="status">{status}</p>:null}{error?<p className="core-error" role="alert">{error}</p>:null}</Card>;
}
