'use client';

import { useEffect,useRef,useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusChip } from '../../components/ui/StatusChip';
import { useI18n } from '../../i18n/I18nProvider';
import { DexieVaultPersistence } from '../../vault/db';
import { VaultService } from '../../vault/vault-service';
import { continuePrivately } from '../onboarding/private-onboarding';
import { LIFE_STAGE_MODES,capabilitiesForLifeStage,lifeStageLabel,type LifeStageMode } from './life-stage';
import { LifeStageSettingsRepository } from './life-stage-settings-repository';

export function LifeStageWorkspace(){
 const {t}=useI18n();const repositoryRef=useRef<LifeStageSettingsRepository|null>(null),vaultRef=useRef<VaultService|null>(null);
 const[mode,setMode]=useState<LifeStageMode>('cycleTracking'),[ready,setReady]=useState(false),[saving,setSaving]=useState(false),[status,setStatus]=useState(()=>t('core.vault.opening')),[error,setError]=useState('');
 useEffect(()=>{let cancelled=false;const vault=new VaultService(new DexieVaultPersistence());vaultRef.current=vault;void(async()=>{await continuePrivately(vault);const repository=new LifeStageSettingsRepository(vault),loaded=await repository.load();if(cancelled)return;repositoryRef.current=repository;setMode(loaded);setStatus(t('core.vault.ready'));setReady(true);})().catch(()=>{if(cancelled)return;setStatus(t('core.vault.unavailable'));setError(t('lifeStage.error'));setReady(true);});return()=>{cancelled=true;repositoryRef.current=null;vaultRef.current=null;vault.lock();};},[t]);
 const save=async()=>{const repository=repositoryRef.current;if(!repository)return;setSaving(true);setError('');try{await repository.save(mode);setStatus(t('core.saved'));}catch {setError(t('lifeStage.saveError'));}finally{setSaving(false);}};
 const capabilities=capabilitiesForLifeStage(mode);
 return <section className="account-free-core" data-testid="life-stage-workspace" aria-busy={!ready}><div className="account-free-core__status"><StatusChip tone={error?'danger':ready?'success':'info'}>{status}</StatusChip><span className="workspace-note">{t('lifeStage.status')}</span></div>{error?<p className="core-error" role="alert">{error}</p>:null}
 {ready&&!error?<div className="workspace-grid"><Card eyebrow={t('lifeStage.context')} title={t('lifeStage.title')}><p>{t('lifeStage.summary')}</p><fieldset><legend>{t('lifeStage.legend')}</legend>{LIFE_STAGE_MODES.map(candidate=><label key={candidate} className="core-check-row"><input type="radio" name="life-stage" value={candidate} checked={mode===candidate} onChange={()=>setMode(candidate)}/><span>{lifeStageLabel(candidate)}</span></label>)}</fieldset><Button disabled={saving} onClick={()=>{void save();}}>{saving?t('lifeStage.saving'):t('lifeStage.save')}</Button></Card>
 <Card eyebrow={t('lifeStage.behavior')} title={lifeStageLabel(mode)}><p>{t('lifeStage.nextPrediction',{state:capabilities.predictNextPeriod?t('lifeStage.available'):t('lifeStage.paused')})}</p><p>{t('lifeStage.fertility',{state:capabilities.showFertilityObservations?t('lifeStage.shown'):t('lifeStage.notEmphasized')})}</p><p>{t('lifeStage.pregnancy',{state:capabilities.showPregnancyLogging?t('lifeStage.shown'):t('lifeStage.notEmphasized')})}</p><p>{t('lifeStage.history')}</p><p className="workspace-note">{t('lifeStage.boundary')}</p></Card></div>:null}</section>;
}
