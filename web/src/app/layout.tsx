import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { PwaBootstrap } from '../components/pwa/PwaBootstrap';
import './globals.css';
import './pwa.css';
import './vault.css';

export const metadata: Metadata = {
  title: 'Sreva — Private, local-first women\'s health',
  description:
    'Sreva is a privacy-first menstrual and cycle health companion with local-first core features and optional encrypted continuity.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const basePath = process.env.NEXT_PUBLIC_SREVA_BASE_PATH ?? '';

  return (
    <html lang="en">
      <head>
        <link rel="manifest" href={`${basePath}/manifest.webmanifest`} />
        <meta name="theme-color" content="#75153a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Sreva" />
      </head>
      <body>
        <PwaBootstrap />
        {children}
      </body>
    </html>
  );
}
