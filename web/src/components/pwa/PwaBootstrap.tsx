'use client';

import { useEffect } from 'react';

import { registerSreadyaServiceWorker } from '../../pwa/register-service-worker';

export function PwaBootstrap() {
  useEffect(() => {
    void registerSreadyaServiceWorker().catch(() => {
      // Registration failure must not block the account-free local application.
      // The install/offline UI remains truthful because capability is detected separately.
    });
  }, []);

  return null;
}
