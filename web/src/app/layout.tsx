import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'Sreva — Private, local-first women\'s health',
  description:
    'Sreva is a privacy-first menstrual and cycle health companion with local-first core features and optional encrypted continuity.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
