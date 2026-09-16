import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CycleVaultWorkspace } from './CycleVaultWorkspace';

describe('CycleVaultWorkspace', () => {
  it('starts account-free behind the encrypted local vault boundary with explicit local backup semantics', () => {
    const html = renderToStaticMarkup(<CycleVaultWorkspace />);

    expect(html).toContain('Opening encrypted local vault');
    expect(html).toContain('Account-free');
    expect(html).toContain('encrypted CycleVault recovery file');
    expect(html).toContain('nothing is uploaded to Sreva');
    expect(html).not.toContain('Sign in required');
  });
});
