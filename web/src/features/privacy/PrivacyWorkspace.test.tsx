import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PrivacyWorkspace } from './PrivacyWorkspace';

describe('PrivacyWorkspace', () => {
  it('starts behind the account-free encrypted local boundary without claiming unavailable protections', () => {
    const html = renderToStaticMarkup(<PrivacyWorkspace />);

    expect(html).toContain('Opening encrypted local vault');
    expect(html).toContain('Account-free');
    expect(html).toContain('privacy status');
    expect(html).not.toContain('Sign in required');
    expect(html).not.toContain('Biometric lock enabled');
    expect(html).not.toContain('Cloud sync enabled');
  });
});
