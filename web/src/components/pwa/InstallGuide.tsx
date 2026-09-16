'use client';

import { useMemo } from 'react';

import { detectInstallCapability } from '../../pwa/install-capability';
import { StatusChip } from '../ui/StatusChip';

export type InstallGuideTarget = 'iphone' | 'android' | 'pwa';

const copy: Record<InstallGuideTarget, { title: string; steps: string[] }> = {
  iphone: {
    title: 'Install Sreva on iPhone',
    steps: [
      'Open this page in Safari.',
      'Tap Share.',
      'Choose Add to Home Screen, then confirm Add.',
    ],
  },
  android: {
    title: 'Install Sreva on Android',
    steps: [
      'Open this page in a supported browser such as Chrome.',
      'Open the browser menu and choose Install app or Add to Home screen.',
      'Confirm the installation prompt.',
    ],
  },
  pwa: {
    title: 'Install the Sreva PWA',
    steps: [
      'Open Sreva in a supported browser.',
      'Use the browser installation action when it is offered.',
      'Launch Sreva from the installed app icon for a focused standalone experience.',
    ],
  },
};

export function InstallGuide({ target }: { target: InstallGuideTarget }) {
  const capability = useMemo(() => detectInstallCapability(), []);
  const guide = copy[target];

  return (
    <section className="install-guide" aria-labelledby={`install-${target}-title`}>
      <div className="install-guide__topline">
        <p className="public-eyebrow">Install without an account</p>
        <StatusChip tone={capability.standalone ? 'success' : 'info'}>
          {capability.standalone ? 'Installed' : 'Browser install'}
        </StatusChip>
      </div>
      <h2 id={`install-${target}-title`}>{guide.title}</h2>
      <ol>
        {guide.steps.map((step) => <li key={step}>{step}</li>)}
      </ol>
      <aside className="install-guide__privacy">
        <strong>Installation does not create a Sreva account.</strong>
        <p>Core Web health use remains local-first. Browser storage can still be erased by site-data clearing, device reset or browser policy, so keep a reviewed recovery backup when that feature is available.</p>
      </aside>
    </section>
  );
}
