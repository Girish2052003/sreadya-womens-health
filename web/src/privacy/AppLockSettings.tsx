'use client';

import { useEffect, useState } from 'react';

import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import {
  getAutoLockMinutes,
  isPinConfigured,
  removePin,
  setAutoLockMinutes,
  setPin,
} from './app-lock';
import { SREVA_APP_LOCK_CHANGE_EVENT } from './WebAppLockGate';

export function AppLockSettings() {
  const [configured, setConfigured] = useState(false);
  const [pin, setPinValue] = useState('');
  const [confirm, setConfirm] = useState('');
  const [minutes, setMinutes] = useState(5);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setConfigured(isPinConfigured(window.localStorage));
    setMinutes(getAutoLockMinutes(window.localStorage));
  }, []);

  const save = async () => {
    setError('');
    setStatus('');
    if (pin !== confirm) {
      setError('PIN confirmation does not match.');
      return;
    }
    try {
      await setPin(window.localStorage, pin, minutes);
      setConfigured(true);
      setPinValue('');
      setConfirm('');
      setStatus('PIN app lock saved. Sreva will lock this private workspace now.');
      window.dispatchEvent(new Event(SREVA_APP_LOCK_CHANGE_EVENT));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sreva could not save the PIN app lock.');
    }
  };

  const updateMinutes = (value: number) => {
    setMinutes(value);
    if (configured) {
      setAutoLockMinutes(window.localStorage, value);
      setStatus('Automatic-lock interval updated.');
    }
  };

  const remove = () => {
    removePin(window.localStorage);
    setConfigured(false);
    setStatus('PIN app lock removed.');
    window.dispatchEvent(new Event(SREVA_APP_LOCK_CHANGE_EVENT));
  };

  return (
    <Card eyebrow="Privacy gate" title="PIN app lock & automatic lock">
      <p>Web/PWA cannot honestly claim native biometric protection. A local PIN can gate the private workspace without becoming the vault-encryption key.</p>
      <div className="settings-grid">
        <label><span>Automatic lock</span><select value={minutes} onChange={(event) => updateMinutes(Number(event.currentTarget.value))}>
          <option value="1">After 1 minute</option><option value="5">After 5 minutes</option>
          <option value="15">After 15 minutes</option><option value="30">After 30 minutes</option>
        </select></label>
        <label><span>{configured ? 'New PIN' : 'PIN'}</span><input type="password" inputMode="numeric" pattern="[0-9]*" value={pin} onChange={(event) => setPinValue(event.currentTarget.value)} /></label>
        <label><span>Confirm PIN</span><input type="password" inputMode="numeric" pattern="[0-9]*" value={confirm} onChange={(event) => setConfirm(event.currentTarget.value)} /></label>
      </div>
      <div className="continuity-actions">
        <Button onClick={() => { void save(); }} disabled={pin.length < 4 || confirm.length < 4}>{configured ? 'Change PIN lock' : 'Enable PIN lock'}</Button>
        {configured ? <Button variant="quiet" onClick={remove}>Remove PIN lock</Button> : null}
      </div>
      {status ? <p role="status">{status}</p> : null}
      {error ? <p className="core-error" role="alert">{error}</p> : null}
    </Card>
  );
}
