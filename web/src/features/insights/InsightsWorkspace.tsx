'use client';

import { useEffect, useState } from 'react';

import { Card } from '../../components/ui/Card';
import { StatusChip } from '../../components/ui/StatusChip';
import type { ObservationKind, RecordSource } from '../../domain/cycle/types';
import { DexieVaultPersistence } from '../../vault/db';
import { HealthVaultRepository } from '../../vault/health-repository';
import { VaultService } from '../../vault/vault-service';
import { continuePrivately } from '../onboarding/private-onboarding';
import { PredictionHistoryRepository } from '../predictions/prediction-history-repository';
import { summarizeInsights, type InsightSnapshot } from './insight-engine';

const SOURCE_LABELS: Record<RecordSource, string> = {
  app: 'Sreadya app', healthKit: 'Apple Health', healthConnect: 'Health Connect', cycleVault: 'CycleVault',
};

function number(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function count(snapshot: InsightSnapshot, kinds: ObservationKind[]): number {
  return kinds.reduce((sum, kind) => sum + (snapshot.observationCounts[kind] ?? 0), 0);
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
      const predictionHistory = new PredictionHistoryRepository(vault);
      const [periods, observations, history] = await Promise.all([
        repository.listPeriods(),
        repository.listObservations(),
        predictionHistory.list(),
      ]);
      if (cancelled) return;
      setSnapshot(summarizeInsights({
        periods,
        observations,
        predictionEvaluation: predictionHistory.evaluate(history, periods),
      }));
      setStatus('Encrypted local vault ready');
      setReady(true);
    })().catch(() => {
      if (cancelled) return;
      setStatus('Local vault unavailable');
      setError('Sreadya could not prepare local insights from the encrypted history in this browser.');
      setReady(true);
    });

    return () => {
      cancelled = true;
      vault.lock();
    };
  }, []);

  const hasData = snapshot !== null && (snapshot.provenance.dateRange !== null || snapshot.observationalMessages.length > 0);

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
            {snapshot.cycleSummary ? <>
              <p>Average cycle length: <strong>{number(snapshot.cycleSummary.averageLength)} days</strong></p>
              <p>Shortest / longest: <strong>{number(snapshot.cycleSummary.shortestLength)} / {number(snapshot.cycleSummary.longestLength)} days</strong></p>
              <p>Recorded variation: <strong>{number(snapshot.cycleSummary.standardDeviation)} days</strong></p>
            </> : <p>More completed cycle intervals are needed before a cycle-length summary can be shown.</p>}
            <p>Average recorded period duration: <strong>{snapshot.averagePeriodDurationDays === null ? 'Not enough completed periods' : `${number(snapshot.averagePeriodDurationDays)} days`}</strong></p>
          </Card>

          <Card eyebrow="Historical graph" title="Cycle-length history">
            {snapshot.cycleLengths.length ? (
              <div className="insight-bars" role="img" aria-label={`Cycle lengths in days: ${snapshot.cycleLengths.join(', ')}`}>
                {snapshot.cycleLengths.map((days, index) => <div key={index}><span style={{ width: `${Math.min(100, (days / 45) * 100)}%` }} /><strong>{days}d</strong></div>)}
              </div>
            ) : <p>No completed cycle intervals are available yet.</p>}
          </Card>

          <Card eyebrow="Flow patterns" title="Flow patterns">
            {Object.keys(snapshot.flowCounts).length ? <ul>{Object.entries(snapshot.flowCounts).map(([flow, value]) => <li key={flow}>{flow}: <strong>{value}</strong> log(s)</li>)}</ul> : <p>No structured flow history yet.</p>}
          </Card>

          <Card eyebrow="PMS patterns" title="PMS patterns">
            {snapshot.pmsPatternMessages.length ? <ul>{snapshot.pmsPatternMessages.map((message) => <li key={message}>{message}</li>)}</ul> : <p>No repeated pre-period symptom timing is available yet. Sreadya does not invent a PMS pattern.</p>}
          </Card>

          <Card eyebrow="Pain trends" title="Pain trends">
            <p>Cramps / headache / migraine / back pain / breast tenderness logs: <strong>{count(snapshot, ['cramps','headache','migraine','backPain','breastTenderness'])}</strong></p>
            <p className="workspace-note">Counts and timing are observations, not diagnoses or causes.</p>
          </Card>

          <Card eyebrow="Mood & sleep" title="Sleep patterns">
            <p>Sleep logs: <strong>{count(snapshot, ['sleep'])}</strong> · Energy logs: <strong>{count(snapshot, ['energy'])}</strong></p>
            <p>Mood / stress / anxiety / irritability logs: <strong>{count(snapshot, ['mood','stress','anxiety','irritability'])}</strong></p>
          </Card>

          <Card eyebrow="Prediction accuracy" title="Prediction accuracy">
            {snapshot.predictionEvaluation && snapshot.predictionEvaluation.sampleCount > 0 ? <>
              <p>Evaluated outcomes: <strong>{snapshot.predictionEvaluation.sampleCount}</strong></p>
              <p>Mean absolute error: <strong>{number(snapshot.predictionEvaluation.meanAbsoluteErrorDays)} days</strong></p>
              <p>Window coverage: <strong>{Math.round(snapshot.predictionEvaluation.windowCoverage * 100)}%</strong></p>
            </> : <p>No completed prediction/outcome pairs are available yet. Sreadya does not fabricate an accuracy score.</p>}
          </Card>

          <Card eyebrow="Patterns" title="Observational insights">
            {snapshot.observationalMessages.length ? <ul>{snapshot.observationalMessages.map((message) => <li key={message}>{message}</li>)}</ul> : <p>No repeated local pattern is strong enough to summarize yet.</p>}
            <p className="workspace-note">These are summaries of your entries. They are not diagnoses or explanations of medical cause.</p>
          </Card>

          <Card eyebrow="Explainability" title="What this used">
            {snapshot.provenance.dateRange ? <p>Covered history: <strong>{snapshot.provenance.dateRange.from.slice(0, 10)} to {snapshot.provenance.dateRange.to.slice(0, 10)}</strong></p> : <p>No health-history date range is available yet.</p>}
            <p>Sources: <strong>{snapshot.provenance.sources.length ? snapshot.provenance.sources.map((source) => SOURCE_LABELS[source]).join(', ') : 'None yet'}</strong></p>
            <p className="workspace-note">Calculated in this browser from the encrypted local vault.</p>
          </Card>

          {!hasData ? <Card eyebrow="Start with truth" title="No insight invented"><p>Log or import enough history first. Sreadya will not create a pattern merely to fill this page.</p></Card> : null}
        </div>
      ) : null}
    </section>
  );
}
