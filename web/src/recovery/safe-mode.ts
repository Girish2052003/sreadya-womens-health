import type { DiagnosticTechnicalInput } from '../diagnostics/diagnostic-report';

export type SafeModeReason = 'corrupt_vault' | 'migration_failed' | 'storage_pressure';

export type SafeModeAction =
  | 'retry_read'
  | 'export_encrypted_backup'
  | 'download_sanitized_diagnostics'
  | 'review_migration'
  | 'free_device_storage';

export type SafeModeState = {
  mode: 'read-only';
  reason: SafeModeReason;
  preserveExistingData: true;
  automaticResetAllowed: false;
  writesAllowed: false;
  title: string;
  message: string;
  actions: readonly SafeModeAction[];
};

const COMMON_ACTIONS = [
  'retry_read',
  'export_encrypted_backup',
  'download_sanitized_diagnostics',
] as const;

export function createSafeModeState(reason: SafeModeReason): SafeModeState {
  switch (reason) {
    case 'corrupt_vault':
      return {
        mode: 'read-only',
        reason,
        preserveExistingData: true,
        automaticResetAllowed: false,
        writesAllowed: false,
        title: 'Local vault integrity needs attention',
        message:
          'Sreadya stopped health-data changes because an encrypted local record could not be verified. Existing local data has not been reset or overwritten.',
        actions: COMMON_ACTIONS,
      };
    case 'migration_failed':
      return {
        mode: 'read-only',
        reason,
        preserveExistingData: true,
        automaticResetAllowed: false,
        writesAllowed: false,
        title: 'Local data upgrade did not complete',
        message:
          'Sreadya stopped health-data changes because the local schema upgrade did not complete safely. Existing local data has not been reset or overwritten.',
        actions: [...COMMON_ACTIONS, 'review_migration'],
      };
    case 'storage_pressure':
      return {
        mode: 'read-only',
        reason,
        preserveExistingData: true,
        automaticResetAllowed: false,
        writesAllowed: false,
        title: 'Device storage needs attention',
        message:
          'Sreadya stopped health-data changes because local persistence may not be reliable. Existing local data has not been reset or overwritten.',
        actions: [...COMMON_ACTIONS, 'free_device_storage'],
      };
  }
}

export function assertRecoveryWriteAllowed(state: SafeModeState | null): void {
  if (state) {
    throw new Error('Sreadya safe mode is read-only; existing health data must not be changed.');
  }
}

export function safeModeIntegrity(state: SafeModeState): DiagnosticTechnicalInput['integrity'] {
  switch (state.reason) {
    case 'corrupt_vault':
      return { state: 'failed', code: 'vault_record_auth_failed' };
    case 'migration_failed':
      return { state: 'failed', code: 'migration_failed' };
    case 'storage_pressure':
      return { state: 'degraded', code: 'storage_pressure' };
  }
}
