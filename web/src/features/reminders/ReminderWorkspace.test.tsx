import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ReminderWorkspace } from './ReminderWorkspace';

describe('ReminderWorkspace', () => {
  it('starts account-free behind the encrypted local vault boundary', () => {
    const html = renderToStaticMarkup(<ReminderWorkspace />);

    expect(html).toContain('Opening encrypted local vault');
    expect(html).toContain('Account-free');
    expect(html).toContain('local authoritative data');
    expect(html).not.toContain('Sign in required');
  });
});
