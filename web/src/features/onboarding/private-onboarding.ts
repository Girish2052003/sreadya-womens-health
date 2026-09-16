import type { VaultService } from '../../vault/vault-service';

export type PrivateOnboardingResult = {
  mode: 'account-free' | 'account-required';
  account: null | { id: string };
};

export async function continuePrivately(_vault: VaultService): Promise<PrivateOnboardingResult> {
  return { mode: 'account-required', account: { id: 'not-created' } };
}
