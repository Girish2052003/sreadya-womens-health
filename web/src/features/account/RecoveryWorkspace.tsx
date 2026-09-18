'use client';
import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { unwrapRecoveryEnvelope,type RecoveryEnvelope } from '../../account/recovery';
import { useI18n } from '../../i18n/I18nProvider';
function decodeHex(value:string,errorMessage:string):Uint8Array<ArrayBuffer>{const trimmed=value.trim();if(!/^[0-9a-fA-F]{64}$/.test(trimmed))throw new Error(errorMessage);return Uint8Array.from(trimmed.match(/../g)??[],part=>Number.parseInt(part,16));}
export function RecoveryWorkspace(){
 const {t}=useI18n();const[secret,setSecret]=useState(''),[envelope,setEnvelope]=useState(''),[status,setStatus]=useState(''),[error,setError]=useState('');
 const verify=async()=>{setStatus('');setError('');let recoverySecret:Uint8Array<ArrayBuffer>|null=null,root:Uint8Array<ArrayBuffer>|null=null;try{recoverySecret=decodeHex(secret,t('recovery.keyError'));root=await unwrapRecoveryEnvelope(recoverySecret,JSON.parse(envelope) as RecoveryEnvelope);setStatus(t('recovery.success'));}catch {setError(t('recovery.error'));}finally{recoverySecret?.fill(0);root?.fill(0);}};
 return <div className="workspace-grid"><Card eyebrow={t('recovery.eyebrow')} title={t('recovery.title')}><p>{t('recovery.body')}</p><div className="continuity-form"><label><span>{t('recovery.key')}</span><input type="password" autoComplete="off" value={secret} onChange={e=>setSecret(e.target.value)}/></label><label><span>{t('recovery.package')}</span><textarea value={envelope} onChange={e=>setEnvelope(e.target.value)}/></label><Button disabled={!secret||!envelope} onClick={()=>{void verify();}}>{t('recovery.verify')}</Button>{status?<p role="status">{status}</p>:null}{error?<p className="core-error" role="alert">{error}</p>:null}</div></Card><Card eyebrow={t('recovery.boundaryEyebrow')} title={t('recovery.boundaryTitle')}><p>{t('recovery.boundaryBody')}</p><p className="workspace-note">{t('recovery.boundaryNote')}</p></Card></div>;
}
