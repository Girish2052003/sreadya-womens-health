import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import AccountPage from './account/page';
import DevicesPage from './devices/page';
import RecoveryPage from './recovery/page';
import SyncPage from './sync/page';

const CASES = [
  ['Account', AccountPage],
  ['Devices', DevicesPage],
  ['Recovery', RecoveryPage],
  ['Sync', SyncPage],
] as const;

describe('Task 23 account continuity pages', () => {
  it.each(CASES)('gives %s a dedicated private workspace shell', (title, Page) => {
    const html = renderToStaticMarkup(<Page />);

    expect(html).toContain(`<h1>${title}</h1>`);
    expect(html).toContain('Private workspace');
  });

  it('keeps account mode optional and deletion claims server-scoped', () => {
    const html = renderToStaticMarkup(<AccountPage />);
    expect(html).toContain('optional');
    expect(html).toContain('server');
    expect(html).toContain('former devices');
  });

  it('explains trusted-device approval and revocation', () => {
    const html = renderToStaticMarkup(<DevicesPage />);
    expect(html).toContain('trusted device');
    expect(html).toContain('approve');
    expect(html).toContain('revoked');
  });

  it('makes the recovery key user-held rather than an email or SMS secret', () => {
    const html = renderToStaticMarkup(<RecoveryPage />);
    expect(html).toContain('recovery key');
    expect(html).toContain('Email or SMS');
    expect(html).toContain('cannot unlock');
  });

  it('describes encrypted sync as optional and pausable', () => {
    const html = renderToStaticMarkup(<SyncPage />);
    expect(html).toContain('encrypted');
    expect(html).toContain('optional');
    expect(html).toContain('pause');
  });
});
