'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { registerPasskey, loginWithPasskey } from '../../account/passkeys';

const ACCOUNT_KEY = 'sreva:account-id:v1';

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_SREVA_SYNC_BASE_URL ?? '').replace(/\/$/, '');
}

export function AccountWorkspace() {
  const endpoint = useMemo(baseUrl, []);
  const [accountId, setAccountId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('Account-free mode active');
  const [error, setError] = useState('');

  useEffect(() => {
    setAccountId(localStorage.getItem(ACCOUNT_KEY) ?? '');
  }, []);

  const createIdentity = async () => {
    if (!endpoint) return;
    if (!email.trim() && !phone.trim()) {
      setError('Enter an email, a mobile number, or both.');
      return;
    }
    setError('');
    const id = accountId || 'acct_' + crypto.randomUUID();
    try {
      const response = await fetch(endpoint + '/v1/accounts/identity', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: id,
          ...(email.trim() ? { email: email.trim() } : {}),
          ...(phone.trim() ? { phone: phone.trim() } : {}),
        }),
      });
      if (!response.ok) throw new Error('Identity request was rejected.');
      localStorage.setItem(ACCOUNT_KEY, id);
      setAccountId(id);
      setStatus('Account identity accepted · add a passkey next');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Account identity could not be created.');
    }
  };

  const addPasskey = async () => {
    if (!endpoint || !accountId) return;
    setError('');
    try {
      await registerPasskey(accountId, { baseURL: endpoint });
      setStatus('Passkey registered');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Passkey registration failed.');
    }
  };

  const signIn = async () => {
    if (!endpoint) return;
    setError('');
    try {
      const id = await loginWithPasskey({ baseURL: endpoint });
      localStorage.setItem(ACCOUNT_KEY, id);
      setAccountId(id);
      setStatus('Signed in with passkey');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Passkey sign-in failed.');
    }
  };

  return (
    <div className="workspace-grid">
      <Card eyebrow="Optional account" title="Account-free remains complete">
        <div className="continuity-state"><strong>Current mode</strong>{accountId ? 'Account identity is linked in this browser.' : 'Account-free local Sreva is active.'}</div>
        <p>Creating an account adds encrypted continuity convenience. It does not unlock stronger health features and does not give Sreva a key to decrypt the local health vault.</p>
        {!endpoint ? <p className="workspace-note">This static deployment has no approved identity/sync service URL configured. Account-free health features remain available; continuity controls stay disabled rather than pretending to work.</p> : null}
      </Card>
      <Card eyebrow="Email / phone / passkey" title="Create or access account identity">
        <div className="continuity-form">
          <label><span>Email (optional)</span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!endpoint} /></label>
          <label><span>Mobile number (optional)</span><input type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!endpoint} /></label>
          <div className="continuity-actions">
            <Button onClick={() => { void createIdentity(); }} disabled={!endpoint}>Create identity</Button>
            <Button variant="secondary" onClick={() => { void addPasskey(); }} disabled={!endpoint || !accountId}>Add passkey</Button>
            <Button variant="quiet" onClick={() => { void signIn(); }} disabled={!endpoint}>Sign in with passkey</Button>
          </div>
          <p role="status">{status}</p>
          {error ? <p className="core-error" role="alert">{error}</p> : null}
          {accountId ? <p className="workspace-note">Local account reference: {accountId}</p> : null}
        </div>
      </Card>
    </div>
  );
}
