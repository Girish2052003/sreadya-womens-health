'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusChip } from '../../components/ui/StatusChip';
import { DexieVaultPersistence } from '../../vault/db';
import { VaultService } from '../../vault/vault-service';
import { continuePrivately } from '../onboarding/private-onboarding';
import {
  LIFE_STAGE_MODES,
  capabilitiesForLifeStage,
  lifeStageLabel,
  type LifeStageMode,
} from './life-stage';
import { LifeStageSettingsRepository } from './life-stage-settings-repository';

export function LifeStageWorkspace() {
  const repositoryRef = useRef<LifeStageSettingsRepository | null>(null);
  const vaultRef = useRef<VaultService | null>(null);
  const [mode, setMode] = useState<LifeStageMode>('cycleTracking');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('Opening encrypted local vault…');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const vault = new VaultService(new DexieVaultPersistence());
    vaultRef.current = vault;

    void (async () => {
      await continuePrivately(vault);
      const repository = new LifeStageSettingsRepository(vault);
      const loaded = await repository.load();
      if (cancelled) return;
      repositoryRef.current = repository;
      setMode(loaded);
      setStatus('Encrypted local vault ready');
      setReady(true);
    })().catch(() => {
      if (cancelled) return;
      setStatus('Local vault unavailable');
      setError('Sreadya could not open the encrypted life-stage preference in this browser.');
      setReady(true);
    });

    return () => {
      cancelled = true;
      repositoryRef.current = null;
      vaultRef.current = null;
      vault.lock();
    };
  }, []);

  const save = async () => {
    const repository = repositoryRef.current;
    if (!repository) return;
    setSaving(true);
    setError('');
    try {
      await repository.save(mode);
      setStatus('Saved locally · encrypted');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sreadya could not save the life-stage preference.');
    } finally {
      setSaving(false);
    }
  };

  const capabilities = capabilitiesForLifeStage(mode);

  return (
    <section className="account-free-core" data-testid="life-stage-workspace" aria-busy={!ready}>
      <div className="account-free-core__status">
        <StatusChip tone={error ? 'danger' : ready ? 'success' : 'info'}>{status}</StatusChip>
        <span className="workspace-note">Account-free · encrypted preference · cycle history preserved</span>
      </div>
      {error ? <p className="core-error" role="alert">{error}</p> : null}

      {ready && !error ? (
        <div className="workspace-grid">
          <Card eyebrow="Context" title="Life stage">
            <p>Choose the context that best matches how you want Sreadya to behave now. Changing this setting never deletes earlier cycle history.</p>
            <fieldset>
              <legend>Life-stage mode</legend>
              {LIFE_STAGE_MODES.map((candidate) => (
                <label key={candidate} className="core-check-row">
                  <input
                    type="radio"
                    name="life-stage"
                    value={candidate}
                    checked={mode === candidate}
                    onChange={() => setMode(candidate)}
                  />
                  <span>{lifeStageLabel(candidate)}</span>
                </label>
              ))}
            </fieldset>
            <Button disabled={saving} onClick={() => { void save(); }}>
              {saving ? 'Saving…' : 'Save life stage'}
            </Button>
          </Card>

          <Card eyebrow="Behavior" title={lifeStageLabel(mode)}>
            <p>Next-period prediction: <strong>{capabilities.predictNextPeriod ? 'available from local history' : 'paused for this mode'}</strong>.</p>
            <p>Fertility observations: <strong>{capabilities.showFertilityObservations ? 'shown' : 'not emphasized'}</strong>.</p>
            <p>Pregnancy logging: <strong>{capabilities.showPregnancyLogging ? 'shown' : 'not emphasized'}</strong>.</p>
            <p>Historical cycles: <strong>preserved</strong>.</p>
            <p className="workspace-note">Hormonal-contraception context does not claim or estimate contraceptive effectiveness.</p>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
