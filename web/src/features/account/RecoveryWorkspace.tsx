'use client';

import { useState } from 'react';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { unwrapRecoveryEnvelope, type RecoveryEnvelope } from '../../account/recovery';

function decodeHex(value: string): Uint8Array<ArrayBuffer> {
  const trimmed = value.trim();
  if (!/^[0-9a-fA-F]{64}$/.test(trimmed)) throw new Error('Recovery key must contain exactly 64 hexadecimal characters.');
  return Uint8Array.from(trimmed.match(/../g) ?? [], (part) => Number.parseInt(part, 16));
}

export function RecoveryWorkspace() {
  const [secret, setSecret] = useState('');
  const [envelope, setEnvelope] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const verify = async () => {
    setStatus('');
    setError('');
    let recoverySecret: Uint8Array<ArrayBuffer> | null = null;
    let root: Uint8Array<ArrayBuffer> | null = null;
    try {
      recoverySecret = decodeHex(secret);
      const parsed = JSON.parse(envelope) as RecoveryEnvelope;
      root = await unwrapRecoveryEnvelope(recoverySecret, parsed);
      setStatus('Recovery key and encrypted recovery package authenticated successfully.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Recovery verification failed.');
    } finally {
      recoverySecret?.fill(0);
      root?.fill(0);
    }
  };

  return (
    <div className="workspace-grid">
      <Card eyebrow="Emergency recovery" title="Verify user-held recovery material">
        <p>Sreadya can validate a user-held recovery key against a reviewed encrypted recovery package locally. The recovered vault-root secret is not displayed and is cleared immediately after verification.</p>
        <div className="continuity-form">
          <label><span>Recovery key (hex)</span><input type="password" autoComplete="off" value={secret} onChange={(e) => setSecret(e.target.value)} /></label>
          <label><span>Encrypted recovery package</span><textarea value={envelope} onChange={(e) => setEnvelope(e.target.value)} /></label>
          <Button disabled={!secret || !envelope} onClick={() => { void verify(); }}>Verify recovery package</Button>
          {status ? <p role="status">{status}</p> : null}
          {error ? <p className="core-error" role="alert">{error}</p> : null}
        </div>
      </Card>
      <Card eyebrow="Boundary" title="Email or SMS is not a vault key">
        <p>Email or SMS may help recover account identity when a reviewed provider is configured, but Email or SMS cannot unlock the old health vault and neither can independently decrypt it.</p>
        <p className="workspace-note">If every trusted device and the recovery key are lost, old encrypted vault continuity can become unrecoverable. That is part of the E2EE guarantee.</p>
      </Card>
    </div>
  );
}
