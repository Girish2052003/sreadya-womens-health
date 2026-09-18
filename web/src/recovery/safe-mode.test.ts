import { describe, expect, it } from 'vitest';

import { assertRecoveryWriteAllowed, createSafeModeState, safeModeIntegrity } from './safe-mode';

const REASONS = ['corrupt_vault', 'migration_failed', 'storage_pressure'] as const;

describe('safe recovery mode', () => {
  it.each(REASONS)('preserves local data and blocks writes for %s', (reason) => {
    const state = createSafeModeState(reason);

    expect(state).toMatchObject({
      mode: 'read-only',
      reason,
      preserveExistingData: true,
      automaticResetAllowed: false,
      writesAllowed: false,
    });
    expect(state.actions).toContain('export_encrypted_backup');
    expect(state.actions).toContain('download_sanitized_diagnostics');
    expect(state.actions).not.toContain('reset_vault');
    expect(() => assertRecoveryWriteAllowed(state)).toThrow(
      'Sreadya safe mode is read-only; existing health data must not be changed.',
    );
  });

  it('maps recovery reasons to technical integrity state without health payload', () => {
    expect(safeModeIntegrity(createSafeModeState('corrupt_vault'))).toEqual({
      state: 'failed',
      code: 'vault_record_auth_failed',
    });
    expect(safeModeIntegrity(createSafeModeState('migration_failed'))).toEqual({
      state: 'failed',
      code: 'migration_failed',
    });
    expect(safeModeIntegrity(createSafeModeState('storage_pressure'))).toEqual({
      state: 'degraded',
      code: 'storage_pressure',
    });
  });

  it('permits normal writes only when no safe-mode state is active', () => {
    expect(() => assertRecoveryWriteAllowed(null)).not.toThrow();
  });
});
