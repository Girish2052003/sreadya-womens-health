'use client';

import { useEffect, useState } from 'react';

import { StatusChip } from '../../components/ui/StatusChip';
import { DexieVaultPersistence } from '../../vault/db';
import { HealthVaultRepository } from '../../vault/health-repository';
import { VaultService } from '../../vault/vault-service';
import { continuePrivately } from '../onboarding/private-onboarding';
import { PredictionCorePanel } from './PredictionCorePanel';
import type { PredictionResult } from './prediction-engine';
import { predictFromRepository } from './prediction-service';

export function PredictionWorkspace() {
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [vaultStatus, setVaultStatus] = useState('Opening encrypted local vault…');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const vault = new VaultService(new DexieVaultPersistence());

    void (async () => {
      await continuePrivately(vault);
      const repository = new HealthVaultRepository(vault);
      const nextPrediction = await predictFromRepository(repository, new Date().toISOString());
      if (cancelled) return;
      setPrediction(nextPrediction);
      setVaultStatus('Encrypted local vault ready');
      setReady(true);
    })().catch(() => {
      if (cancelled) return;
      setVaultStatus('Local vault unavailable');
      setError('Sreva could not calculate a prediction from the encrypted local history in this browser.');
      setReady(true);
    });

    return () => {
      cancelled = true;
      vault.lock();
    };
  }, []);

  return (
    <section className="account-free-core" data-testid="prediction-workspace" aria-busy={!ready}>
      <div className="account-free-core__status">
        <StatusChip tone={error ? 'danger' : ready ? 'success' : 'info'}>{vaultStatus}</StatusChip>
        <span className="workspace-note">Account-free · local calculation · local authoritative data</span>
      </div>
      {error ? <p className="core-error" role="alert">{error}</p> : null}
      {ready && !error ? <PredictionCorePanel prediction={prediction} /> : null}
    </section>
  );
}
