'use client';
import { useEffect,useMemo,useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useI18n } from '../../i18n/I18nProvider';
import { registerPasskey,loginWithPasskey } from '../../account/passkeys';
const ACCOUNT_KEY='sreadya:account-id:v1';
function baseUrl():string{return(process.env.NEXT_PUBLIC_SREADYA_SYNC_BASE_URL??'').replace(/\/$/,'');}
export function AccountWorkspace(){
 const {t}=useI18n(),endpoint=useMemo(baseUrl,[]);const[accountId,setAccountId]=useState(''),[email,setEmail]=useState(''),[phone,setPhone]=useState(''),[status,setStatus]=useState(()=>t('account.status.free')),[error,setError]=useState('');
 useEffect(()=>setAccountId(localStorage.getItem(ACCOUNT_KEY)??''),[]);
 const createIdentity=async()=>{if(!endpoint)return;if(!email.trim()&&!phone.trim()){setError(t('account.error.contact'));return;}setError('');const id=accountId||'acct_'+crypto.randomUUID();try{const response=await fetch(endpoint+'/v1/accounts/identity',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({account_id:id,...(email.trim()?{email:email.trim()}:{}),...(phone.trim()?{phone:phone.trim()}:{})})});if(!response.ok)throw new Error(t('account.error.identityRejected'));localStorage.setItem(ACCOUNT_KEY,id);setAccountId(id);setStatus(t('account.status.accepted'));}catch(cause){setError(t('account.error.create'));}};
 const addPasskey=async()=>{if(!endpoint||!accountId)return;setError('');try{await registerPasskey(accountId,{baseURL:endpoint});setStatus(t('account.status.passkey'));}catch(cause){setError(t('account.error.passkey'));}};
 const signIn=async()=>{if(!endpoint)return;setError('');try{const id=await loginWithPasskey({baseURL:endpoint});localStorage.setItem(ACCOUNT_KEY,id);setAccountId(id);setStatus(t('account.status.signedIn'));}catch(cause){setError(t('account.error.signIn'));}};
 return <div className="workspace-grid"><Card eyebrow={t('account.eyebrow')} title={t('account.title')}><div className="continuity-state"><strong>{t('account.current')}</strong>{accountId?t('account.linked'):t('account.local')}</div><p>{t('account.body')}</p><p className="workspace-note">{t('account.deleteBoundary')}</p>{!endpoint?<p className="workspace-note">{t('account.noEndpoint')}</p>:null}</Card>
 <Card eyebrow={t('account.identityEyebrow')} title={t('account.identityTitle')}><div className="continuity-form"><label><span>{t('account.email')}</span><input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} disabled={!endpoint}/></label><label><span>{t('account.phone')}</span><input type="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} disabled={!endpoint}/></label><div className="continuity-actions"><Button onClick={()=>{void createIdentity();}} disabled={!endpoint}>{t('account.create')}</Button><Button variant="secondary" onClick={()=>{void addPasskey();}} disabled={!endpoint||!accountId}>{t('account.addPasskey')}</Button><Button variant="quiet" onClick={()=>{void signIn();}} disabled={!endpoint}>{t('account.signIn')}</Button></div><p role="status">{status}</p>{error?<p className="core-error" role="alert">{error}</p>:null}{accountId?<p className="workspace-note">{t('account.reference',{id:accountId})}</p>:null}</div></Card></div>;
}
