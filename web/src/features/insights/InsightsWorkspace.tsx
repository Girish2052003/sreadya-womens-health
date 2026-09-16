'use client';

import { useEffect, useState } from 'react';

import { Card } from '../../components/ui/Card';
import { StatusChip } from '../../components/ui/StatusChip';
import type { RecordSource } from '../../domain/cycle/types';
import { DexieVaultPersistence } from '../../vault/db';
import { HealthVaultRepository } from '../../vault/health-repository';
import { VaultService } from '../../vault/vault-service';
import { continuePrivately } from '../onboarding/private-onboarding';
import { summarizeInsights, type InsightSnapshot } from './insight-engine';

const SOURCE_LABELS: Record<RecordSource, string> = {
  app: 'Sreva app',
  healthKit: 'Apple Health',
  healthConnect: 'Health Connect',
  cycleVault: 'CycleVault',
};

function number(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function InsightsWorkspace() {
  const [snapshot, setSnapshot] = useState<InsightSnapshot | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Opening encrypted local vault…');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const vault = new VaultService(new DexieVaultPersistence());

    void (async () => {
      await continuePrivately(vault);
      const repository = new HealthVaultRepository(vault);
      const [periods, observations] = await Promise.all([
        repository.listPeriods(),
        repository.listObservations(),
      ]);
      if (cancelled) return;
      setSnapshot(summarizeInsights({ periods, observations }));
      setStatus('Encrypted local vault ready');
      setReady(true);
    })().catch(() => {
      if (cancelled) return;
      setStatus('Local vault unavailable');
      setError('Sreva could not prepare local insights from the encrypted history in this browser.');
      setReady(true);
    });

    return () => {
      cancelled = true;
      vault.lock();
    };
  }, []);

  const hasData = snapshot !== null
    && (snapshot.provenance.dateRange !== null || snapshot.observationalMessages.length > 0);

  return (
    <section className="account-free-core" data-testid="insights-workspace" aria-busy={!ready}>
      <div className="account-free-core__status">
        <StatusChip tone={error ? 'danger' : ready ? 'success' : 'info'}>{status}</StatusChip>
        <span className="workspace-note">Account-free · local observations · no health telemetry</span>
      </div>
      {error ? <p className="core-error" role="alert">{error}</p> : null}

      {ready && !error && snapshot ? (
        <div className="workspace-grid">
          <Card eyebrow="Observed locally" title="Cycle summary">
            {snapshot.cycleSummary ? (
              <>
                <p>Average cycle length: <strong>{number(snapshot.cycleSummary.averageLength)} days</strong></p>
                <p>Shortest / longest: <strong>{number(snapshot.cycleSummary.shortestLength)} / {number(snapshot.cycleSummary.longestLength)} days</strong></p>
                <p>Recorded variation: <strong>{number(snapshot.cycleSummary.standardDeviation)} days</strong></p>
              </>
            ) : <p>More completed cycle intervals are needed before a cycle-length summary can be shown.</p>}
            <p>Average recorded period duration: <strong>{snapshot.averagePeriodDurationDays === null ? 'Not enough completed periods' : `${number(snapshot.averagePeriodDurationDays)} days`}</strong></p>
          </Card>

          <Card eyebrow="Patterns" title="Observational insights">
            {snapshot.observationalMessages.length > 0 ? (
              <ul>
                {snapshot.observationalMessages.map((message) => <li key={message}>{message}</li>)}
              </ul>
            ) : <p>No repeated local pattern is strong enough to summarize yet.</p>}
            <p className="workspace-note">These are summaries of your entries. They are not diagnoses or explanations of medical cause.</p>
          </Card>

          <Card eyebrow="Explainability" title="What this used">
            {snapshot.provenance.dateRange ? (
              <p>Covered history: <strong>{snapshot.provenance.dateRange.from.slice(0, 10)} to {snapshot.provenance.dateRange.to.slice(0, 10)}</strong></p>
            ) : <p>No health-history date range is available yet.</p>}
            <p>Sources: <strong>{snapshot.provenance.sources.length > 0 ? snapshot.provenance.sources.map((source) => SOURCE_LABELS[source]).join(', ') : 'None yet'}</strong></p>
            <p className="workspace-note">Calculated in this browser from the encrypted local vault.</p>
          </Card>

          {!hasData ? (
            <Card eyebrow="Start with truth" title="No insight invented">
              <p>Log or import enough history first. Sreva will not create a pattern merely to fill this page.</p>
            </Card>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
