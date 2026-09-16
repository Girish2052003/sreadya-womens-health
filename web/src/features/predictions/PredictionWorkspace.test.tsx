import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PredictionWorkspace } from './PredictionWorkspace';

describe('PredictionWorkspace', () => {
  it('starts behind the same account-free encrypted local boundary as the cycle workspace', () => {
    const html = renderToStaticMarkup(<PredictionWorkspace />);

    expect(html).toContain('Opening encrypted local vault');
    expect(html).toContain('Account-free');
    expect(html).toContain('local authoritative data');
    expect(html).not.toContain('Sign in required');
  });
});
