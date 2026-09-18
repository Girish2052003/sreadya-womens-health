import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AccessibilityBootstrap } from '../accessibility/AccessibilityBootstrap';
import { PwaBootstrap } from '../components/pwa/PwaBootstrap';
import './globals.css';
import './accessibility.css';
import './pwa.css';
import './vault.css';
import './product-completeness.css';

export const metadata: Metadata = {
  title: 'Sreadya — Private, local-first women\'s health',
  description:
    'Sreadya is a privacy-first menstrual and cycle health companion with local-first core features and optional encrypted continuity.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const basePath = process.env.NEXT_PUBLIC_SREADYA_BASE_PATH ?? '';

  return (
    <html lang="en">
      <head>
        <link rel="manifest" href={`${basePath}/manifest.webmanifest`} />
        <meta name="theme-color" content="#75153a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Sreadya" />
      </head>
      <body>
        <AccessibilityBootstrap />
        <PwaBootstrap />
        {children}
      </body>
    </html>
  );
}
