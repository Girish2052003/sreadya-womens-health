'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusChip } from '../../components/ui/StatusChip';
import type { HealthObservation, PeriodEpisode } from '../../domain/cycle/types';
import { DexieVaultPersistence } from '../../vault/db';
import { HealthVaultRepository } from '../../vault/health-repository';
import { VaultService } from '../../vault/vault-service';
import { continuePrivately } from '../onboarding/private-onboarding';
import {
  REPORT_CATEGORIES,
  SAFE_REPORT_CATEGORIES,
  buildCsvReport,
  buildPdfReport,
  buildReportPreview,
  type ReportCategory,
} from './report-builder';

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  periods: 'Periods',
  flow: 'Flow',
  symptoms: 'Symptoms',
  pain: 'Pain',
  medications: 'Medications & supplements',
  temperature: 'Basal body temperature',
  ovulation: 'Ovulation observations',
  privateNotes: 'Private notes',
  sexualActivity: 'Sexual activity',
};

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function pdfBlob(bytes: Uint8Array<ArrayBufferLike>): Blob {
  const ownedBytes = new Uint8Array(bytes.byteLength);
  ownedBytes.set(bytes);
  return new Blob([ownedBytes.buffer], { type: 'application/pdf' });
}

export function ReportsWorkspace() {
  const today = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(() => {
    const date = new Date(today);
    date.setFullYear(date.getFullYear() - 1);
    return dateKey(date);
  }, [today]);
  const [periods, setPeriods] = useState<PeriodEpisode[]>([]);
  const [observations, setObservations] = useState<HealthObservation[]>([]);
  const [categories, setCategories] = useState<ReportCategory[]>(() => [...SAFE_REPORT_CATEGORIES]);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(() => dateKey(today));
  const [preview, setPreview] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Opening encrypted local vault…');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const vault = new VaultService(new DexieVaultPersistence());
    void (async () => {
      await continuePrivately(vault);
      const repository = new HealthVaultRepository(vault);
      const [nextPeriods, nextObservations] = await Promise.all([
        repository.listPeriods(),
        repository.listObservations(),
      ]);
      if (cancelled) return;
      setPeriods(nextPeriods);
      setObservations(nextObservations);
      setStatus('Encrypted local vault ready');
      setReady(true);
    })().catch(() => {
      if (cancelled) return;
      setStatus('Local vault unavailable');
      setError('Sreva could not prepare a local report from the encrypted history in this browser.');
      setReady(true);
    });
    return () => {
      cancelled = true;
      vault.lock();
    };
  }, []);

  const selection = { categories, from, to };
  const invalidatePreview = () => setPreview(null);

  const toggleCategory = (category: ReportCategory, checked: boolean) => {
    setCategories((current) => checked
      ? [...current, category]
      : current.filter((candidate) => candidate !== category));
    invalidatePreview();
  };

  const preparePreview = () => {
    setError('');
    try {
      setPreview(buildReportPreview({ periods, observations, selection }));
    } catch (cause) {
      setPreview(null);
      setError(cause instanceof Error ? cause.message : 'Sreva could not prepare the report preview.');
    }
  };

  const downloadCsv = () => {
    const csv = buildCsvReport({ periods, observations, selection });
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'sreva-health-report.csv');
  };

  const downloadPdf = async () => {
    const bytes = await buildPdfReport({ periods, observations, selection });
    downloadBlob(pdfBlob(bytes), 'sreva-health-report.pdf');
  };

  return (
    <section className="account-free-core" data-testid="reports-workspace" aria-busy={!ready}>
      <div className="account-free-core__status">
        <StatusChip tone={error ? 'danger' : ready ? 'success' : 'info'}>{status}</StatusChip>
        <span className="workspace-note">Account-free · generated locally · nothing sent to Sreva</span>
      </div>
      {error ? <p className="core-error" role="alert">{error}</p> : null}

      {ready ? (
        <div className="workspace-grid">
          <Card eyebrow="Doctor report" title="Choose what leaves your device">
            <div className="core-date-form">
              <label><span>From</span><input aria-label="Report from" type="date" value={from} onChange={(event) => { setFrom(event.target.value); invalidatePreview(); }} /></label>
              <label><span>To</span><input aria-label="Report to" type="date" value={to} onChange={(event) => { setTo(event.target.value); invalidatePreview(); }} /></label>
            </div>
            <fieldset>
              <legend>Included categories</legend>
              {REPORT_CATEGORIES.map((category) => (
                <label key={category} className="core-check-row">
                  <input
                    type="checkbox"
                    checked={categories.includes(category)}
                    onChange={(event) => toggleCategory(category, event.target.checked)}
                  />
                  <span>{CATEGORY_LABELS[category]}</span>
                </label>
              ))}
            </fieldset>
            <p className="workspace-note">Private notes and sexual activity are excluded by default and require explicit selection.</p>
            <Button onClick={preparePreview}>Preview report</Button>
          </Card>

          <Card eyebrow="Review first" title="Local preview">
            {preview === null ? (
              <p>Choose the date range and categories, then preview the exact content before any download or share action becomes available.</p>
            ) : (
              <>
                <pre data-testid="report-preview" style={{ whiteSpace: 'pre-wrap' }}>{preview}</pre>
                <div className="core-actions">
                  <Button variant="secondary" onClick={downloadCsv}>Download CSV</Button>
                  <Button variant="secondary" onClick={() => { void downloadPdf(); }}>Download PDF</Button>
                </div>
              </>
            )}
          </Card>
        </div>
      ) : null}
    </section>
  );
}
