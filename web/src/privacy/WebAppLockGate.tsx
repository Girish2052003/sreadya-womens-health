'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '../components/ui/Button';
import { getAutoLockMinutes, isPinConfigured, verifyPin } from './app-lock';

const CHANGE_EVENT = 'sreva-app-lock-changed';

export function WebAppLockGate({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [failures, setFailures] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState(0);
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    const synchronize = () => {
      const nextConfigured = isPinConfigured(window.localStorage);
      setConfigured(nextConfigured);
      setUnlocked(!nextConfigured);
      setPin('');
      setError('');
      lastActivity.current = Date.now();
      setHydrated(true);
    };
    synchronize();
    window.addEventListener(CHANGE_EVENT, synchronize);
    return () => window.removeEventListener(CHANGE_EVENT, synchronize);
  }, []);

  useEffect(() => {
    if (!hydrated || !configured || !unlocked) return;

    const touch = () => { lastActivity.current = Date.now(); };
    const automaticLock = () => {
      const minutes = getAutoLockMinutes(window.localStorage);
      if (Date.now() - lastActivity.current >= minutes * 60_000) {
        setUnlocked(false);
        setPin('');
        setError('');
      }
    };
    const visibility = () => {
      if (document.visibilityState === 'hidden') {
        setUnlocked(false);
        setPin('');
        setError('');
      }
    };

    window.addEventListener('pointerdown', touch, { passive: true });
    window.addEventListener('keydown', touch);
    window.addEventListener('focus', touch);
    document.addEventListener('visibilitychange', visibility);
    const timer = window.setInterval(automaticLock, 15_000);

    return () => {
      window.removeEventListener('pointerdown', touch);
      window.removeEventListener('keydown', touch);
      window.removeEventListener('focus', touch);
      document.removeEventListener('visibilitychange', visibility);
      window.clearInterval(timer);
    };
  }, [configured, hydrated, unlocked]);

  const unlock = async () => {
    if (Date.now() < blockedUntil) {
      setError('Too many incorrect attempts. Try again shortly.');
      return;
    }
    const valid = await verifyPin(window.localStorage, pin);
    if (valid) {
      setUnlocked(true);
      setPin('');
      setError('');
      setFailures(0);
      lastActivity.current = Date.now();
      return;
    }
    const nextFailures = failures + 1;
    setFailures(nextFailures);
    setPin('');
    if (nextFailures >= 5) {
      setBlockedUntil(Date.now() + 30_000);
      setFailures(0);
      setError('Too many incorrect attempts. Sreva paused PIN attempts for 30 seconds.');
    } else {
      setError('Incorrect PIN.');
    }
  };

  if (!hydrated) {
    return <main className="app-lock-screen" aria-busy="true"><p>Opening private Sreva workspace…</p></main>;
  }

  if (configured && !unlocked) {
    return (
      <main className="app-lock-screen">
        <section className="app-lock-card" aria-labelledby="app-lock-title">
          <span className="workspace-topbar__mark" aria-hidden="true">S</span>
          <p className="public-eyebrow">Private workspace locked</p>
          <h1 id="app-lock-title">Unlock Sreva</h1>
          <p>Your browser-local PIN is a privacy gate. It is separate from the encrypted vault key and is not used as the encryption key.</p>
          <form onSubmit={(event) => { event.preventDefault(); void unlock(); }}>
            <label><span>PIN</span><input aria-label="Sreva PIN" type="password" inputMode="numeric" pattern="[0-9]*" autoComplete="off" value={pin} onChange={(event) => setPin(event.target.value)} /></label>
            <Button type="submit" disabled={pin.length < 4}>Unlock</Button>
          </form>
          {error ? <p className="core-error" role="alert">{error}</p> : null}
          <p className="workspace-note">Automatic lock activates after the configured inactivity interval and whenever this page becomes hidden.</p>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}

export const SREVA_APP_LOCK_CHANGE_EVENT = CHANGE_EVENT;
