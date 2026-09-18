'use client';

import { useState } from 'react';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { buildDiagnosticReport, type DiagnosticReport } from '../../diagnostics/diagnostic-report';

function download(report: DiagnosticReport) {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'sreva-sanitized-diagnostics.json';
  anchor.click();
  URL.revokeObjectURL(url);
}

function browserName(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Safari/')) return 'Safari';
  return 'Browser';
}

export function DiagnosticsWorkspace() {
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [error, setError] = useState('');

  const generate = async () => {
    setError('');
    try {
      const notification = typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
      const persistentStorage = !navigator.storage?.persisted
        ? 'unsupported'
        : await navigator.storage.persisted() ? 'granted' : 'denied';

      setReport(buildDiagnosticReport({
        appVersion: '1.0.0-web',
        predictionEngine: 'prediction-v1',
        reminderEngine: 'reminder-v1',
        healthAdapter: 'web-manual-v1',
        lastMigration: 'schema-v1-no-migration-required',
        browser: { name: browserName(), version: 'current-runtime' },
        schema: { vaultVersion: 1, supported: true },
        engine: {
          crypto: typeof crypto?.subtle === 'undefined' ? 'unavailable' : 'webcrypto',
          persistence: typeof indexedDB === 'undefined' ? 'unavailable' : 'indexeddb',
        },
        permissions: { notifications: notification, persistentStorage },
        integrity: { state: 'ok' },
      }));
    } catch {
      setError('Sreva could not create the sanitized technical report.');
    }
  };

  return (
    <div className="workspace-grid">
      <Card eyebrow="Diagnostics" title="Generate sanitized technical report">
        <p>The report is generated only when you ask. It contains app/browser/schema/engine/permission/integrity state and no period dates, symptoms, notes, sexual activity or fertility/pregnancy payloads.</p>
        <div className="continuity-actions">
          <Button onClick={() => { void generate(); }}>Generate diagnostic preview</Button>
          {report ? <Button variant="secondary" onClick={() => download(report)}>Download sanitized diagnostics</Button> : null}
        </div>
        {error ? <p className="core-error" role="alert">{error}</p> : null}
      </Card>
      <Card eyebrow="Review before sharing" title="Preview">
        {report ? <pre data-testid="diagnostic-preview" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(report, null, 2)}</pre> : <p>No report has been generated.</p>}
      </Card>
    </div>
  );
}
