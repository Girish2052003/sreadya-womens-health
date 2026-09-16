import type { VaultService } from '../../vault/vault-service';

export type PrivateOnboardingResult = {
  mode: 'account-free';
  account: null;
};

export async function continuePrivately(vault: VaultService): Promise<PrivateOnboardingResult> {
  await vault.createOrOpen();
  return { mode: 'account-free', account: null };
}
