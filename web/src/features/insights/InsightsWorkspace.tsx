'use client';

import { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { StatusChip } from '../../components/ui/StatusChip';
import type { ObservationKind, RecordSource } from '../../domain/cycle/types';
import { useI18n } from '../../i18n/I18nProvider';
import { DexieVaultPersistence } from '../../vault/db';
import { HealthVaultRepository } from '../../vault/health-repository';
import { VaultService } from '../../vault/vault-service';
import { continuePrivately } from '../onboarding/private-onboarding';
import { PredictionHistoryRepository } from '../predictions/prediction-history-repository';
import { summarizeInsights, type InsightSnapshot } from './insight-engine';

function number(value:number):string{return Number.isInteger(value)?String(value):value.toFixed(1);}
function count(snapshot:InsightSnapshot,kinds:ObservationKind[]):number{return kinds.reduce((sum,kind)=>sum+(snapshot.observationCounts[kind]??0),0);}

export function InsightsWorkspace(){
 const {t}=useI18n(); const [snapshot,setSnapshot]=useState<InsightSnapshot|null>(null),[ready,setReady]=useState(false),[status,setStatus]=useState(()=>t('core.vault.opening')),[error,setError]=useState('');
 useEffect(()=>{let cancelled=false;const vault=new VaultService(new DexieVaultPersistence());void(async()=>{await continuePrivately(vault);const repository=new HealthVaultRepository(vault),predictionHistory=new PredictionHistoryRepository(vault);const[periods,observations,history]=await Promise.all([repository.listPeriods(),repository.listObservations(),predictionHistory.list()]);if(cancelled)return;setSnapshot(summarizeInsights({periods,observations,predictionEvaluation:predictionHistory.evaluate(history,periods)}));setStatus(t('core.vault.ready'));setReady(true);})().catch(()=>{if(cancelled)return;setStatus(t('core.vault.unavailable'));setError(t('insights.error'));setReady(true);});return()=>{cancelled=true;vault.lock();};},[t]);
 const hasData=snapshot!==null&&(snapshot.provenance.dateRange!==null||snapshot.observationalMessages.length>0);
 const sourceName=(source:RecordSource)=>t(`source.${source}`);
 return <section className="account-free-core" data-testid="insights-workspace" aria-busy={!ready}><div className="account-free-core__status"><StatusChip tone={error?'danger':ready?'success':'info'}>{status}</StatusChip><span className="workspace-note">{t('insights.status')}</span></div>{error?<p className="core-error" role="alert">{error}</p>:null}
 {ready&&!error&&snapshot?<div className="workspace-grid">
  <Card eyebrow={t('insights.cycleEyebrow')} title={t('insights.cycleTitle')}>{snapshot.cycleSummary?<><p>{t('insights.average',{days:number(snapshot.cycleSummary.averageLength)})}</p><p>{t('insights.range',{shortest:number(snapshot.cycleSummary.shortestLength),longest:number(snapshot.cycleSummary.longestLength)})}</p><p>{t('insights.variation',{days:number(snapshot.cycleSummary.standardDeviation)})}</p></>:<p>{t('insights.needCycles')}</p>}<p>{t('insights.periodAverage',{value:snapshot.averagePeriodDurationDays===null?t('insights.notEnough'):t('insights.days',{days:number(snapshot.averagePeriodDurationDays)})})}</p></Card>
  <Card eyebrow={t('insights.graphEyebrow')} title={t('insights.graphTitle')}>{snapshot.cycleLengths.length?<div className="insight-bars" role="img" aria-label={t('insights.graphAria',{values:snapshot.cycleLengths.join(', ')})}>{snapshot.cycleLengths.map((days,index)=><div key={index}><span style={{width:`${Math.min(100,(days/45)*100)}%`}}/><strong>{days}d</strong></div>)}</div>:<p>{t('insights.noIntervals')}</p>}</Card>
  <Card eyebrow={t('insights.flowEyebrow')} title={t('insights.flowTitle')}>{Object.keys(snapshot.flowCounts).length?<ul>{Object.entries(snapshot.flowCounts).map(([flow,value])=><li key={flow}>{t('insights.flowCount',{flow:t(`observation.flow.${flow}`,{},flow),count:value})}</li>)}</ul>:<p>{t('insights.noFlow')}</p>}</Card>
  <Card eyebrow={t('insights.pmsEyebrow')} title={t('insights.pmsTitle')}>{snapshot.pmsPatternMessages.length?<ul>{snapshot.pmsPatternMessages.map((message)=><li key={message}>{message}</li>)}</ul>:<p>{t('insights.noPms')}</p>}</Card>
  <Card eyebrow={t('insights.painEyebrow')} title={t('insights.painTitle')}><p>{t('insights.painCount',{count:count(snapshot,['cramps','headache','migraine','backPain','breastTenderness'])})}</p><p className="workspace-note">{t('insights.observationBoundary')}</p></Card>
  <Card eyebrow={t('insights.moodEyebrow')} title={t('insights.moodTitle')}><p>{t('insights.sleepCount',{sleep:count(snapshot,['sleep']),energy:count(snapshot,['energy'])})}</p><p>{t('insights.moodCount',{count:count(snapshot,['mood','stress','anxiety','irritability'])})}</p></Card>
  <Card eyebrow={t('insights.accuracyEyebrow')} title={t('insights.accuracyTitle')}>{snapshot.predictionEvaluation&&snapshot.predictionEvaluation.sampleCount>0?<><p>{t('prediction.evaluated',{count:snapshot.predictionEvaluation.sampleCount})}</p><p>{t('prediction.mae',{days:number(snapshot.predictionEvaluation.meanAbsoluteErrorDays)})}</p><p>{t('insights.windowCoverage',{percent:Math.round(snapshot.predictionEvaluation.windowCoverage*100)})}</p></>:<p>{t('insights.noAccuracy')}</p>}</Card>
  <Card eyebrow={t('insights.patternsEyebrow')} title={t('insights.patternsTitle')}>{snapshot.observationalMessages.length?<ul>{snapshot.observationalMessages.map((message)=><li key={message}>{message}</li>)}</ul>:<p>{t('insights.noPattern')}</p>}<p className="workspace-note">{t('insights.patternBoundary')}</p></Card>
  <Card eyebrow={t('insights.explainEyebrow')} title={t('insights.explainTitle')}>{snapshot.provenance.dateRange?<p>{t('insights.covered',{from:snapshot.provenance.dateRange.from.slice(0,10),to:snapshot.provenance.dateRange.to.slice(0,10)})}</p>:<p>{t('insights.noRange')}</p>}<p>{t('insights.sources',{sources:snapshot.provenance.sources.length?snapshot.provenance.sources.map(sourceName).join(', '):t('insights.none')})}</p><p className="workspace-note">{t('insights.calculated')}</p></Card>
  {!hasData?<Card eyebrow={t('insights.truthEyebrow')} title={t('insights.truthTitle')}><p>{t('insights.truthBody')}</p></Card>:null}
 </div>:null}</section>;
}
