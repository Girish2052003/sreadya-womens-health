'use client';

import { useEffect, useRef, useState } from 'react';

import { DexieVaultPersistence } from '../../vault/db';
import { LOCAL_ONLY_DATA_LOSS_WARNING, VaultService } from '../../vault/vault-service';
import { Button } from '../ui/Button';
import { StatusChip } from '../ui/StatusChip';

const TEST_RECORD_ID = 'sreva-e2e-vault-record';
const CYCLEVAULT_KDF_MEMORY_KIB = 19 * 1024;

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

export function VaultLocalOnlyPanel() {
  const serviceRef = useRef<VaultService | null>(null);
  const [status, setStatus] = useState('Opening encrypted local vault…');
  const [payload, setPayload] = useState('{"note":"KNOWN-PLAINTEXT-SENTINEL","periodStart":"2099-12-31","flow":"heavy"}');
  const [result, setResult] = useState('');
  const [cycleVaultPassphrase, setCycleVaultPassphrase] = useState('');
  const [cycleVaultSalt, setCycleVaultSalt] = useState('');
  const [cycleVaultContainer, setCycleVaultContainer] = useState('');
  const [cycleVaultKey, setCycleVaultKey] = useState('');
  const [cycleVaultLatency, setCycleVaultLatency] = useState('');
  const [cycleVaultPayload, setCycleVaultPayload] = useState('');
  const testHarness = process.env.NEXT_PUBLIC_SREVA_VAULT_TEST_HARNESS === '1';
  const cycleVaultTestHarness = process.env.NEXT_PUBLIC_SREVA_CYCLEVAULT_TEST_HARNESS === '1';

  useEffect(() => {
    let cancelled = false;
    const service = new VaultService(new DexieVaultPersistence());
    serviceRef.current = service;
    void service.createOrOpen().then(() => {
      if (!cancelled) setStatus('Encrypted local vault ready');
    }).catch(() => {
      if (!cancelled) setStatus('Local vault unavailable');
    });
    return () => {
      cancelled = true;
      service.lock();
    };
  }, []);

  async function sealHarnessRecord() {
    const service = serviceRef.current;
    if (!service) return;
    try {
      if (!service.isUnlocked) await service.openFromStoredKey();
      await service.write(TEST_RECORD_ID, JSON.parse(payload) as unknown);
      setResult('sealed');
    } catch {
      setResult('Vault write failed');
    }
  }

  async function readHarnessRecord() {
    const service = serviceRef.current;
    if (!service) return;
    try {
      if (!service.isUnlocked) await service.openFromStoredKey();
      const value = await service.read<unknown>(TEST_RECORD_ID);
      setResult(JSON.stringify(value));
    } catch {
      setResult('Vault read failed');
    }
  }

  function lockHarness() {
    serviceRef.current?.lock();
    setResult('locked');
  }

  async function benchmarkCycleVaultKdf() {
    setCycleVaultKey('');
    setCycleVaultLatency('');
    try {
      const { deriveCycleVaultKeyAsync } = await import('../../crypto/cyclevault');
      const salt = base64ToBytes(cycleVaultSalt);
      const startedAt = performance.now();
      const key = await deriveCycleVaultKeyAsync(cycleVaultPassphrase, salt);
      const elapsedMs = performance.now() - startedAt;
      try {
        setCycleVaultKey(bytesToHex(key));
        setCycleVaultLatency(String(elapsedMs));
      } finally {
        key.fill(0);
      }
    } catch {
      setCycleVaultKey('CycleVault KDF failed');
      setCycleVaultLatency('NaN');
    }
  }

  async function decryptCycleVaultVector() {
    setCycleVaultPayload('');
    try {
      const { openCycleVaultV1 } = await import('../../crypto/cyclevault');
      const clear = await openCycleVaultV1(cycleVaultContainer, cycleVaultPassphrase);
      setCycleVaultPayload(JSON.stringify(clear));
    } catch {
      setCycleVaultPayload('CycleVault decrypt failed');
    }
  }

  return (
    <section className="vault-local-panel" aria-labelledby="vault-local-title">
      <div className="vault-local-panel__heading">
        <div>
          <p className="workspace-kicker">Encrypted browser storage</p>
          <h2 id="vault-local-title">Local vault protection</h2>
        </div>
        <StatusChip tone={status.includes('ready') ? 'success' : 'info'}>{status}</StatusChip>
      </div>
      <p className="vault-local-panel__warning"><strong>Local-only storage warning.</strong> {LOCAL_ONLY_DATA_LOSS_WARNING}</p>
      <p className="workspace-note">Sreva seals each persisted health record with native WebCrypto AES-256-GCM. Record bodies remain ciphertext in IndexedDB; browser storage is not presented as equivalent to secure hardware.</p>

      {testHarness ? (
        <div className="vault-test-harness" data-testid="vault-test-harness">
          <label htmlFor="vault-test-payload">Verification payload</label>
          <textarea id="vault-test-payload" value={payload} onChange={(event) => setPayload(event.target.value)} />
          <div className="vault-test-harness__actions">
            <Button onClick={() => void sealHarnessRecord()}>Seal test record</Button>
            <Button variant="secondary" onClick={() => void readHarnessRecord()}>Read test record</Button>
            <Button variant="quiet" onClick={lockHarness}>Lock test vault</Button>
          </div>
          <output data-testid="vault-test-result">{result}</output>
        </div>
      ) : null}

      {cycleVaultTestHarness ? (
        <div className="vault-test-harness" data-testid="cyclevault-test-harness">
          <p><strong>CycleVault interoperability verification only.</strong> Argon2id memory: {CYCLEVAULT_KDF_MEMORY_KIB} KiB.</p>
          <label htmlFor="cyclevault-test-passphrase">CycleVault test passphrase</label>
          <input
            id="cyclevault-test-passphrase"
            type="password"
            autoComplete="off"
            value={cycleVaultPassphrase}
            onChange={(event) => setCycleVaultPassphrase(event.target.value)}
          />
          <label htmlFor="cyclevault-test-salt">CycleVault test salt</label>
          <input
            id="cyclevault-test-salt"
            value={cycleVaultSalt}
            onChange={(event) => setCycleVaultSalt(event.target.value)}
          />
          <Button onClick={() => void benchmarkCycleVaultKdf()}>Benchmark CycleVault KDF</Button>
          <output data-testid="cyclevault-test-key">{cycleVaultKey}</output>
          <output data-testid="cyclevault-test-latency">{cycleVaultLatency}</output>

          <label htmlFor="cyclevault-test-container">CycleVault test container</label>
          <textarea
            id="cyclevault-test-container"
            value={cycleVaultContainer}
            onChange={(event) => setCycleVaultContainer(event.target.value)}
          />
          <Button variant="secondary" onClick={() => void decryptCycleVaultVector()}>Decrypt CycleVault vector</Button>
          <output data-testid="cyclevault-test-payload">{cycleVaultPayload}</output>
        </div>
      ) : null}
    </section>
  );
}
