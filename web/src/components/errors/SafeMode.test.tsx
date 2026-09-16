import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { createSafeModeState } from '../../recovery/safe-mode';
import { SafeMode } from './SafeMode';

describe('SafeMode', () => {
  it('renders corrupt-vault recovery without destructive controls', () => {
    const html = renderToStaticMarkup(<SafeMode state={createSafeModeState('corrupt_vault')} />);

    for (const text of [
      'Read-only recovery',
      'Local vault integrity needs attention',
      'Existing local data has not been reset or overwritten.',
      'Retry read',
      'Export encrypted backup',
      'Download sanitized diagnostics',
    ]) {
      expect(html).toContain(text);
    }

    for (const forbidden of ['Reset vault', 'Delete data', 'Clear vault', 'Start over']) {
      expect(html).not.toContain(forbidden);
    }
  });

  it('renders reason-specific non-destructive guidance', () => {
    const migration = renderToStaticMarkup(<SafeMode state={createSafeModeState('migration_failed')} />);
    const storage = renderToStaticMarkup(<SafeMode state={createSafeModeState('storage_pressure')} />);

    expect(migration).toContain('Review migration guidance');
    expect(storage).toContain('Free device storage');
  });
});
