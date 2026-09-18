'use client';
import { useEffect,useMemo,useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusChip } from '../../components/ui/StatusChip';
import type { HealthObservation,PeriodEpisode } from '../../domain/cycle/types';
import { useI18n } from '../../i18n/I18nProvider';
import { DexieVaultPersistence } from '../../vault/db';
import { HealthVaultRepository } from '../../vault/health-repository';
import { VaultService } from '../../vault/vault-service';
import { continuePrivately } from '../onboarding/private-onboarding';
import { REPORT_CATEGORIES,SAFE_REPORT_CATEGORIES,buildCsvReport,buildPdfReport,buildReportPreview,type ReportCategory } from './report-builder';
function dateKey(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function downloadBlob(blob:Blob,filename:string){const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=filename;anchor.click();URL.revokeObjectURL(url);}
function pdfBlob(bytes:Uint8Array<ArrayBufferLike>):Blob{const ownedBytes=new Uint8Array(bytes.byteLength);ownedBytes.set(bytes);return new Blob([ownedBytes.buffer],{type:'application/pdf'});}
export function ReportsWorkspace(){
 const {t}=useI18n();const today=useMemo(()=>new Date(),[]),defaultFrom=useMemo(()=>{const d=new Date(today);d.setFullYear(d.getFullYear()-1);return dateKey(d);},[today]);
 const[periods,setPeriods]=useState<PeriodEpisode[]>([]),[observations,setObservations]=useState<HealthObservation[]>([]),[categories,setCategories]=useState<ReportCategory[]>(()=>[...SAFE_REPORT_CATEGORIES]),[from,setFrom]=useState(defaultFrom),[to,setTo]=useState(()=>dateKey(today)),[preview,setPreview]=useState<string|null>(null),[ready,setReady]=useState(false),[status,setStatus]=useState(()=>t('core.vault.opening')),[error,setError]=useState('');
 useEffect(()=>{let cancelled=false;const vault=new VaultService(new DexieVaultPersistence());void(async()=>{await continuePrivately(vault);const r=new HealthVaultRepository(vault),[p,o]=await Promise.all([r.listPeriods(),r.listObservations()]);if(cancelled)return;setPeriods(p);setObservations(o);setStatus(t('core.vault.ready'));setReady(true);})().catch(()=>{if(cancelled)return;setStatus(t('core.vault.unavailable'));setError(t('reports.error'));setReady(true);});return()=>{cancelled=true;vault.lock();};},[t]);
 const selection={categories,from,to},invalidate=()=>setPreview(null),toggle=(c:ReportCategory,checked:boolean)=>{setCategories(cur=>checked?[...cur,c]:cur.filter(x=>x!==c));invalidate();};
 const prepare=()=>{setError('');try{setPreview(buildReportPreview({periods,observations,selection}));}catch(cause){setPreview(null);setError(cause instanceof Error?cause.message:t('reports.previewError'));}};
 const downloadCsv=()=>downloadBlob(new Blob([buildCsvReport({periods,observations,selection})],{type:'text/csv;charset=utf-8'}),'sreadya-health-report.csv');
 const downloadPdf=async()=>downloadBlob(pdfBlob(await buildPdfReport({periods,observations,selection})),'sreadya-health-report.pdf');
 return <section className="account-free-core" data-testid="reports-workspace" aria-busy={!ready}><div className="account-free-core__status"><StatusChip tone={error?'danger':ready?'success':'info'}>{status}</StatusChip><span className="workspace-note">{t('reports.status')}</span></div>{error?<p className="core-error" role="alert">{error}</p>:null}{ready?<div className="workspace-grid">
 <Card eyebrow={t('reports.eyebrow')} title={t('reports.title')}><div className="core-date-form"><label><span>{t('reports.from')}</span><input aria-label={t('reports.fromAria')} type="date" value={from} onChange={e=>{setFrom(e.target.value);invalidate();}}/></label><label><span>{t('reports.to')}</span><input aria-label={t('reports.toAria')} type="date" value={to} onChange={e=>{setTo(e.target.value);invalidate();}}/></label></div><fieldset><legend>{t('reports.categories')}</legend>{REPORT_CATEGORIES.map(c=><label key={c} className="core-check-row"><input type="checkbox" checked={categories.includes(c)} onChange={e=>toggle(c,e.target.checked)}/><span>{t(`reports.category.${c}`)}</span></label>)}</fieldset><p className="workspace-note">{t('reports.sensitive')}</p><Button onClick={prepare}>{t('reports.preview')}</Button></Card>
 <Card eyebrow={t('reports.reviewEyebrow')} title={t('reports.reviewTitle')}>{preview===null?<p>{t('reports.reviewEmpty')}</p>:<><pre data-testid="report-preview" style={{whiteSpace:'pre-wrap'}}>{preview}</pre><div className="core-actions"><Button variant="secondary" onClick={downloadCsv}>{t('reports.csv')}</Button><Button variant="secondary" onClick={()=>{void downloadPdf();}}>{t('reports.pdf')}</Button></div></>}</Card>
 </div>:null}</section>;
}
