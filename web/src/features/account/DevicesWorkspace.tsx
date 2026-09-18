'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { parseTrustedDeviceQr } from '../../account/trusted-devices';

type Device = { device_id: string; account_id: string; state: string };
const ACCOUNT_KEY = 'sreva:account-id:v1';

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_SREVA_SYNC_BASE_URL ?? '').replace(/\/$/, '');
}

export function DevicesWorkspace() {
  const endpoint = useMemo(baseUrl, []);
  const [accountId, setAccountId] = useState('');
  const [devices, setDevices] = useState<Device[]>([]);
  const [qr, setQr] = useState('');
  const [qrStatus, setQrStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => setAccountId(localStorage.getItem(ACCOUNT_KEY) ?? ''), []);

  const refresh = async () => {
    if (!endpoint || !accountId) return;
    setError('');
    try {
      const response = await fetch(endpoint + '/v1/accounts/' + encodeURIComponent(accountId) + '/devices', { credentials: 'include', cache: 'no-store' });
      if (!response.ok) throw new Error('Device list request failed.');
      const value = await response.json() as Device[];
      setDevices(Array.isArray(value) ? value : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sreva could not read the trusted-device list.');
    }
  };

  const inspectQr = () => {
    setError('');
    try {
      const parsed = parseTrustedDeviceQr(qr.trim());
      parsed.transferSecret.fill(0);
      setQrStatus('Valid enrollment package · ' + parsed.enrollmentId);
    } catch (cause) {
      setQrStatus('');
      setError(cause instanceof Error ? cause.message : 'Invalid trusted-device enrollment package.');
    }
  };

  return (
    <div className="workspace-grid">
      <Card eyebrow="Trusted devices" title="Connected device state">
        <div className="continuity-actions"><Button onClick={() => { void refresh(); }} disabled={!endpoint || !accountId}>Refresh device list</Button></div>
        {!endpoint ? <p className="workspace-note">No approved continuity service is configured on this deployment.</p> : null}
        {!accountId ? <p className="workspace-note">Sign in from Account before requesting the server device list.</p> : null}
        {devices.length ? <ul>{devices.map((device) => <li key={device.device_id}><strong>{device.device_id}</strong> · {device.state}</li>)}</ul> : <p>No server device list is loaded.</p>}
        {error ? <p className="core-error" role="alert">{error}</p> : null}
      </Card>
      <Card eyebrow="New-device approval" title="Inspect enrollment QR">
        <div className="continuity-form">
          <label><span>Trusted-device QR payload</span><textarea value={qr} onChange={(e) => setQr(e.target.value)} /></label>
          <Button variant="secondary" disabled={!qr.trim()} onClick={inspectQr}>Validate enrollment package locally</Button>
          {qrStatus ? <p role="status">{qrStatus}</p> : null}
        </div>
        <p className="workspace-note">An already trusted device may approve another device through the authenticated continuity protocol; revoked devices cannot continue continuity. Actual approval/revocation requires an enrolled-device signer and continuity service. Sreva does not turn a QR parse into fake authorization.</p>
      </Card>
    </div>
  );
}
