'use client';

import { useEffect, useState } from 'react';
import { StatusChip } from '../../components/ui/StatusChip';
import type { PredictionEvaluation } from '../../domain/prediction/prediction-history';
import { useI18n } from '../../i18n/I18nProvider';
import { DexieVaultPersistence } from '../../vault/db';
import { HealthVaultRepository } from '../../vault/health-repository';
import { VaultService } from '../../vault/vault-service';
import { LifeStageSettingsRepository } from '../life-stage/life-stage-settings-repository';
import { continuePrivately } from '../onboarding/private-onboarding';
import { PredictionCorePanel } from './PredictionCorePanel';
import type { PredictionResult } from './prediction-engine';
import { PredictionHistoryRepository } from './prediction-history-repository';
import { predictFromRepository } from './prediction-service';

export function PredictionWorkspace() {
  const { t }=useI18n();
  const [prediction,setPrediction]=useState<PredictionResult|null>(null), [historyCount,setHistoryCount]=useState(0);
  const [evaluation,setEvaluation]=useState<PredictionEvaluation|undefined>(), [fertilityEstimatesEnabled,setFertilityEstimatesEnabled]=useState(false);
  const [vaultStatus,setVaultStatus]=useState(()=>t('core.vault.opening')), [ready,setReady]=useState(false), [error,setError]=useState('');
  useEffect(()=>{let cancelled=false; const vault=new VaultService(new DexieVaultPersistence());
    void(async()=>{await continuePrivately(vault); const repository=new HealthVaultRepository(vault), historyRepository=new PredictionHistoryRepository(vault), lifeStageRepository=new LifeStageSettingsRepository(vault);
      const [periods,nextPrediction,lifeStage]=await Promise.all([repository.listPeriods(),predictFromRepository(repository,new Date().toISOString()),lifeStageRepository.load()]);
      let history=await historyRepository.list(); if(nextPrediction) history=await historyRepository.record(nextPrediction,periods,new Date().toISOString());
      if(cancelled)return; setPrediction(nextPrediction);setHistoryCount(history.length);setEvaluation(historyRepository.evaluate(history,periods));setFertilityEstimatesEnabled(lifeStage==='tryingToConceive');setVaultStatus(t('core.vault.ready'));setReady(true);
    })().catch(()=>{if(cancelled)return;setVaultStatus(t('core.vault.unavailable'));setError(t('prediction.workspaceError'));setReady(true);});
    return()=>{cancelled=true;vault.lock();};
  },[t]);
  return <section className="account-free-core" data-testid="prediction-workspace" aria-busy={!ready}><div className="account-free-core__status"><StatusChip tone={error?'danger':ready?'success':'info'}>{vaultStatus}</StatusChip><span className="workspace-note">{t('prediction.workspaceStatus')}</span></div>{error?<p className="core-error" role="alert">{error}</p>:null}{ready&&!error?<PredictionCorePanel prediction={prediction} historyCount={historyCount} evaluation={evaluation} fertilityEstimatesEnabled={fertilityEstimatesEnabled}/>:null}</section>;
}
