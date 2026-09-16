import { expect, test } from '@playwright/test';

import vector from '../../shared/crypto/interoperability-vectors/cyclevault-v1.json';

test('CycleVault v1 exact vector derives and decrypts inside the target browser', async ({ page }, testInfo) => {
  await page.goto('/app/vault/');
  const harness = page.getByTestId('cyclevault-test-harness');
  await expect(harness).toBeVisible();
  await expect(harness.getByText('19456 KiB')).toBeVisible();

  await page.getByLabel('CycleVault test passphrase').fill(vector.passphrase);
  await page.getByLabel('CycleVault test salt').fill(vector.saltBase64);
  await page.getByRole('button', { name: 'Benchmark CycleVault KDF' }).click();

  await expect(page.getByTestId('cyclevault-test-key')).toHaveText(vector.derivedKeyHex, { timeout: 30_000 });
  const latencyText = await page.getByTestId('cyclevault-test-latency').textContent();
  const latencyMs = Number(latencyText);
  expect(Number.isFinite(latencyMs)).toBe(true);
  expect(latencyMs).toBeGreaterThan(0);
  expect(latencyMs).toBeLessThan(15_000);
  console.log(`CycleVault Argon2id ${testInfo.project.name}: ${latencyMs.toFixed(1)} ms at 19456 KiB`);

  await page.getByLabel('CycleVault test container').fill(vector.containerJson);
  await page.getByRole('button', { name: 'Decrypt CycleVault vector' }).click();
  await expect(page.getByTestId('cyclevault-test-payload')).toHaveText(JSON.stringify(vector.payload), { timeout: 30_000 });
});
