'use client';
import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useI18n } from '../../i18n/I18nProvider';
import { buildDiagnosticReport,type DiagnosticReport } from '../../diagnostics/diagnostic-report';
function download(report:DiagnosticReport){const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download='sreadya-sanitized-diagnostics.json';anchor.click();URL.revokeObjectURL(url);}
function browserName():string{const ua=navigator.userAgent;if(ua.includes('Firefox/'))return'Firefox';if(ua.includes('Edg/'))return'Edge';if(ua.includes('Chrome/'))return'Chrome';if(ua.includes('Safari/'))return'Safari';return'Browser';}
export function DiagnosticsWorkspace(){
 const {t}=useI18n();const[report,setReport]=useState<DiagnosticReport|null>(null),[error,setError]=useState('');
 const generate=async()=>{setError('');try{const notification=typeof Notification==='undefined'?'unsupported':Notification.permission,persistentStorage=!navigator.storage?.persisted?'unsupported':await navigator.storage.persisted()?'granted':'denied';setReport(buildDiagnosticReport({appVersion:'1.0.0-web',predictionEngine:'prediction-v1',reminderEngine:'reminder-v1',healthAdapter:'web-manual-v1',lastMigration:'schema-v1-no-migration-required',browser:{name:browserName(),version:'current-runtime'},schema:{vaultVersion:1,supported:true},engine:{crypto:typeof crypto?.subtle==='undefined'?'unavailable':'webcrypto',persistence:typeof indexedDB==='undefined'?'unavailable':'indexeddb'},permissions:{notifications:notification,persistentStorage},integrity:{state:'ok'}}));}catch{setError(t('diagnostics.error'));}};
 return <div className="workspace-grid"><Card eyebrow={t('diagnostics.eyebrow')} title={t('diagnostics.title')}><p>{t('diagnostics.body')}</p><div className="continuity-actions"><Button onClick={()=>{void generate();}}>{t('diagnostics.generate')}</Button>{report?<Button variant="secondary" onClick={()=>download(report)}>{t('diagnostics.download')}</Button>:null}</div>{error?<p className="core-error" role="alert">{error}</p>:null}</Card><Card eyebrow={t('diagnostics.reviewEyebrow')} title={t('diagnostics.preview')}>{report?<pre data-testid="diagnostic-preview" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(report,null,2)}</pre>:<p>{t('diagnostics.empty')}</p>}</Card></div>;
}
