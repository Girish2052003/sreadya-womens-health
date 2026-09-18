'use client';
import { useEffect,useMemo,useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { parseTrustedDeviceQr } from '../../account/trusted-devices';
import { useI18n } from '../../i18n/I18nProvider';
type Device={device_id:string;account_id:string;state:string};const ACCOUNT_KEY='sreadya:account-id:v1';
function baseUrl():string{return(process.env.NEXT_PUBLIC_SREADYA_SYNC_BASE_URL??'').replace(/\/$/,'');}
export function DevicesWorkspace(){
 const {t}=useI18n(),endpoint=useMemo(baseUrl,[]);const[accountId,setAccountId]=useState(''),[devices,setDevices]=useState<Device[]>([]),[qr,setQr]=useState(''),[qrStatus,setQrStatus]=useState(''),[error,setError]=useState('');
 useEffect(()=>setAccountId(localStorage.getItem(ACCOUNT_KEY)??''),[]);
 const refresh=async()=>{if(!endpoint||!accountId)return;setError('');try{const response=await fetch(endpoint+'/v1/accounts/'+encodeURIComponent(accountId)+'/devices',{credentials:'include',cache:'no-store'});if(!response.ok)throw new Error(t('devices.error.request'));const value=await response.json() as Device[];setDevices(Array.isArray(value)?value:[]);}catch(cause){setError(cause instanceof Error?cause.message:t('devices.error.list'));}};
 const inspectQr=()=>{setError('');try{const parsed=parseTrustedDeviceQr(qr.trim());parsed.transferSecret.fill(0);setQrStatus(t('devices.validQr',{id:parsed.enrollmentId}));}catch(cause){setQrStatus('');setError(cause instanceof Error?cause.message:t('devices.invalidQr'));}};
 return <div className="workspace-grid"><Card eyebrow={t('devices.eyebrow')} title={t('devices.title')}><div className="continuity-actions"><Button onClick={()=>{void refresh();}} disabled={!endpoint||!accountId}>{t('devices.refresh')}</Button></div>{!endpoint?<p className="workspace-note">{t('devices.noEndpoint')}</p>:null}{!accountId?<p className="workspace-note">{t('devices.signIn')}</p>:null}{devices.length?<ul>{devices.map(d=><li key={d.device_id}><strong>{d.device_id}</strong> · {d.state}</li>)}</ul>:<p>{t('devices.none')}</p>}{error?<p className="core-error" role="alert">{error}</p>:null}</Card>
 <Card eyebrow={t('devices.approvalEyebrow')} title={t('devices.approvalTitle')}><div className="continuity-form"><label><span>{t('devices.qr')}</span><textarea value={qr} onChange={e=>setQr(e.target.value)}/></label><Button variant="secondary" disabled={!qr.trim()} onClick={inspectQr}>{t('devices.validate')}</Button>{qrStatus?<p role="status">{qrStatus}</p>:null}</div><p className="workspace-note">{t('devices.boundary')}</p></Card></div>;
}
