'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusChip } from '../../components/ui/StatusChip';
import { deriveCycleVaultKeyAsync, openCycleVaultV1 } from '../../crypto/cyclevault';
import { CycleVaultWebService } from '../../crypto/cyclevault-service';
import { DexieVaultPersistence } from '../../vault/db';
import { HealthVaultRepository } from '../../vault/health-repository';
import { LOCAL_ONLY_DATA_LOSS_WARNING, VaultService } from '../../vault/vault-service';
import { continuePrivately } from '../onboarding/private-onboarding';

const CYCLEVAULT_MEMORY_KIB = 19 * 1024;

function downloadCycleVault(container: string) {
  const blob = new Blob([container], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `sreadya-${new Date().toISOString().replaceAll(':', '-')}.cyclevault`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

export function CycleVaultWorkspace() {
  const serviceRef = useRef<CycleVaultWebService | null>(null);
  const vaultRef = useRef<VaultService | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Opening encrypted local vault…');
  const [error, setError] = useState('');

  const [exportPassphrase, setExportPassphrase] = useState('');
  const [exportConfirmation, setExportConfirmation] = useState('');
  const [exporting, setExporting] = useState(false);

  const [restoreFileName, setRestoreFileName] = useState('');
  const [restoreContainer, setRestoreContainer] = useState('');
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [restoreAcknowledged, setRestoreAcknowledged] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [testPassphrase, setTestPassphrase] = useState('');
  const [testSalt, setTestSalt] = useState('');
  const [testContainer, setTestContainer] = useState('');
  const [testKey, setTestKey] = useState('');
  const [testLatency, setTestLatency] = useState('');
  const [testPayload, setTestPayload] = useState('');
  const testHarness = process.env.NEXT_PUBLIC_SREADYA_CYCLEVAULT_TEST_HARNESS === '1';

  useEffect(() => {
    let cancelled = false;
    const vault = new VaultService(new DexieVaultPersistence());
    vaultRef.current = vault;

    void (async () => {
      await continuePrivately(vault);
      if (cancelled) return;
      serviceRef.current = new CycleVaultWebService(new HealthVaultRepository(vault));
      setStatus('Encrypted local vault ready');
      setReady(true);
    })().catch(() => {
      if (cancelled) return;
      setStatus('Local vault unavailable');
      setError('Sreadya could not open the encrypted local vault in this browser.');
      setReady(true);
    });

    return () => {
      cancelled = true;
      serviceRef.current = null;
      vault.lock();
      vaultRef.current = null;
    };
  }, []);

  async function exportBackup() {
    const service = serviceRef.current;
    if (!service) return;
    setError('');
    if (exportPassphrase.length < 12) {
      setError('Use a CycleVault recovery passphrase with at least 12 characters.');
      return;
    }
    if (exportPassphrase !== exportConfirmation) {
      setError('The CycleVault recovery passphrases do not match.');
      return;
    }

    setExporting(true);
    try {
      const container = await service.exportContainer(exportPassphrase);
      downloadCycleVault(container);
      setExportPassphrase('');
      setExportConfirmation('');
      setStatus('Encrypted CycleVault recovery file downloaded locally.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sreadya could not create the encrypted CycleVault recovery file.');
    } finally {
      setExporting(false);
    }
  }

  async function selectRestoreFile(file: File | null) {
    setError('');
    setRestoreAcknowledged(false);
    setRestoreContainer('');
    setRestoreFileName(file?.name ?? '');
    if (!file) return;
    try {
      setRestoreContainer(await file.text());
      setStatus('CycleVault file selected. Nothing has been restored yet.');
    } catch {
      setError('Sreadya could not read that CycleVault file. Your local health data was not changed.');
    }
  }

  async function restoreBackup() {
    const service = serviceRef.current;
    if (!service || !restoreContainer || !restoreAcknowledged) return;
    setError('');
    setRestoring(true);
    try {
      const restored = await service.restoreContainer(restoreContainer, restorePassphrase);
      setStatus(`CycleVault restored locally: ${restored.periods} period record(s), ${restored.observations} observation(s).`);
      setRestoreContainer('');
      setRestoreFileName('');
      setRestorePassphrase('');
      setRestoreAcknowledged(false);
    } catch {
      setError('CycleVault restore failed. Your existing local health data was preserved. Check the file and recovery passphrase.');
    } finally {
      setRestoring(false);
    }
  }

  async function benchmarkTestKdf() {
    setTestKey('');
    setTestLatency('');
    try {
      const startedAt = performance.now();
      const key = await deriveCycleVaultKeyAsync(testPassphrase, base64ToBytes(testSalt));
      const elapsedMs = performance.now() - startedAt;
      try {
        setTestKey(bytesToHex(key));
        setTestLatency(String(elapsedMs));
      } finally {
        key.fill(0);
      }
    } catch {
      setTestKey('CycleVault KDF failed');
      setTestLatency('NaN');
    }
  }

  async function decryptTestVector() {
    setTestPayload('');
    try {
      setTestPayload(JSON.stringify(await openCycleVaultV1(testContainer, testPassphrase)));
    } catch {
      setTestPayload('CycleVault decrypt failed');
    }
  }

  return (
    <section className="account-free-core" data-testid="cyclevault-workspace" aria-busy={!ready}>
      <div className="account-free-core__status">
        <StatusChip tone={error ? 'danger' : ready ? 'success' : 'info'}>{status}</StatusChip>
        <span className="workspace-note">Account-free · encrypted locally · nothing is uploaded to Sreadya</span>
      </div>
      <p className="vault-local-panel__warning"><strong>Local-only storage warning.</strong> {LOCAL_ONLY_DATA_LOSS_WARNING}</p>
      <p className="workspace-note">
        CycleVault creates a user-controlled encrypted CycleVault recovery file for period and observation history. The recovery passphrase is not sent to Sreadya and cannot be recovered by Sreadya.
      </p>
      {error ? <p className="core-error" role="alert">{error}</p> : null}

      {ready ? (
        <div className="workspace-grid">
          <Card eyebrow="Encrypted backup" title="Create a CycleVault recovery file">
            <p>Protect a local recovery copy with a passphrase you control. Keep both the file and passphrase somewhere you trust.</p>
            <div className="core-date-form">
              <label>
                <span>Recovery passphrase</span>
                <input
                  aria-label="CycleVault export passphrase"
                  type="password"
                  autoComplete="new-password"
                  value={exportPassphrase}
                  onChange={(event) => setExportPassphrase(event.target.value)}
                />
              </label>
              <label>
                <span>Confirm passphrase</span>
                <input
                  aria-label="Confirm CycleVault export passphrase"
                  type="password"
                  autoComplete="new-password"
                  value={exportConfirmation}
                  onChange={(event) => setExportConfirmation(event.target.value)}
                />
              </label>
            </div>
            <Button disabled={exporting} onClick={() => { void exportBackup(); }}>
              {exporting ? 'Encrypting locally…' : 'Download encrypted backup'}
            </Button>
          </Card>

          <Card eyebrow="Recovery" title="Restore a CycleVault file">
            <p>Selecting a file does not change your data. Replacement happens only after the explicit confirmation below succeeds.</p>
            <label>
              <span>CycleVault recovery file</span>
              <input
                aria-label="CycleVault recovery file"
                type="file"
                accept=".cyclevault,application/octet-stream"
                onChange={(event) => { void selectRestoreFile(event.currentTarget.files?.[0] ?? null); }}
              />
            </label>
            {restoreFileName ? <p className="workspace-note" data-testid="cyclevault-selected-file">Selected: {restoreFileName}</p> : null}
            <label>
              <span>Recovery passphrase</span>
              <input
                aria-label="CycleVault restore passphrase"
                type="password"
                autoComplete="current-password"
                value={restorePassphrase}
                onChange={(event) => setRestorePassphrase(event.target.value)}
              />
            </label>
            <label className="core-check-row">
              <input
                aria-label="Acknowledge CycleVault replacement"
                type="checkbox"
                checked={restoreAcknowledged}
                onChange={(event) => setRestoreAcknowledged(event.target.checked)}
              />
              <span>I understand that a successful restore replaces the local period and observation history in this browser.</span>
            </label>
            <Button
              variant="secondary"
              disabled={restoring || !restoreContainer || !restorePassphrase || !restoreAcknowledged}
              onClick={() => { void restoreBackup(); }}
            >
              {restoring ? 'Restoring locally…' : 'Replace local health data'}
            </Button>
            <p className="workspace-note">Wrong passphrases, tampered files, unsupported formats, or invalid health records fail before the live encrypted dataset is replaced.</p>
          </Card>
        </div>
      ) : null}

      {testHarness ? (
        <div className="vault-test-harness" data-testid="cyclevault-test-harness">
          <p><strong>CycleVault interoperability verification only.</strong> Argon2id memory: {CYCLEVAULT_MEMORY_KIB} KiB.</p>
          <label htmlFor="cyclevault-test-passphrase">CycleVault test passphrase</label>
          <input id="cyclevault-test-passphrase" type="password" autoComplete="off" value={testPassphrase} onChange={(event) => setTestPassphrase(event.target.value)} />
          <label htmlFor="cyclevault-test-salt">CycleVault test salt</label>
          <input id="cyclevault-test-salt" value={testSalt} onChange={(event) => setTestSalt(event.target.value)} />
          <Button onClick={() => { void benchmarkTestKdf(); }}>Benchmark CycleVault KDF</Button>
          <output data-testid="cyclevault-test-key">{testKey}</output>
          <output data-testid="cyclevault-test-latency">{testLatency}</output>
          <label htmlFor="cyclevault-test-container">CycleVault test container</label>
          <textarea id="cyclevault-test-container" value={testContainer} onChange={(event) => setTestContainer(event.target.value)} />
          <Button variant="secondary" onClick={() => { void decryptTestVector(); }}>Decrypt CycleVault vector</Button>
          <output data-testid="cyclevault-test-payload">{testPayload}</output>
        </div>
      ) : null}
    </section>
  );
}
