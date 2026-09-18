import { expect, test } from '@playwright/test';

test('complete feature hub exposes every production workspace and workspace navigation behaves like an app', async ({ page }) => {
  await page.goto('/app/home/');
  await expect(page.getByRole('link', { name: 'Sreadya workspace home' }).first()).toBeVisible();

  await page.getByRole('link', { name: 'More', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/more\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'More' })).toBeVisible();

  for (const label of [
    'Cycle & periods', 'Predictions', 'Reminders', 'Symptoms', 'Wellness', 'Medication',
    'Reproductive health', 'Life stage', 'Insights', 'Doctor reports', 'Private assistant',
    'Partner sharing', 'Encrypted backup & restore', 'Encrypted sync', 'Trusted devices',
    'Account', 'Recovery', 'Privacy Center', 'Diagnostics', 'Accessibility & settings',
  ]) {
    await expect(page.getByRole('link', { name: label })).toBeVisible();
  }

  await page.getByRole('link', { name: 'Symptoms' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Symptoms' })).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL(/\/app\/more\/$/);
});

test('structured symptom workspace performs a real encrypted local task', async ({ page }) => {
  await page.goto('/app/symptoms/');
  await page.getByLabel('What are you recording?').selectOption('cramps');
  await page.getByLabel('Severity (optional)').selectOption('severe');
  await page.getByLabel('Private note (optional)').fill('SYNTHETIC_PRODUCT_COMPLETENESS_NOTE');
  await page.getByRole('button', { name: 'Save encrypted record' }).click();
  await expect(page.getByText('SYNTHETIC_PRODUCT_COMPLETENESS_NOTE')).toBeVisible();

  await page.reload();
  await expect(page.getByText('SYNTHETIC_PRODUCT_COMPLETENESS_NOTE')).toBeVisible();

  await page.getByRole('button', { name: 'Delete Cramps' }).click();
  await expect(page.getByText('SYNTHETIC_PRODUCT_COMPLETENESS_NOTE')).toHaveCount(0);
});

test('public Features catalogue exposes all 258 launch IDs and keeps future items separate', async ({ page }) => {
  await page.goto('/features/');
  await expect(page.getByRole('heading', { level: 1, name: 'Features' })).toBeVisible();
  await expect(page.locator('[data-capability-id]')).toHaveCount(258);
  await expect(page.getByText('Future / optional — not launch promises')).toBeVisible();
  await page.getByLabel('Find a Sreadya capability').fill('recovery');
  await expect(page.getByText('ID-009')).toBeVisible();
});

test('provider-dependent continuity surfaces fail honestly while local controls remain usable', async ({ page }) => {
  await page.goto('/app/account/');
  await expect(page.getByText(/no approved identity\/sync service url configured/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create identity' })).toBeDisabled();

  await page.goto('/app/sync/');
  await expect(page.getByText(/not configured on this static deployment/i)).toBeVisible();
  await page.getByRole('button', { name: 'Pause sync' }).click();
  await expect(page.getByText(/synchronization paused locally/i)).toBeVisible();
  await page.getByRole('button', { name: 'Resume sync' }).click();
  await expect(page.getByText(/synchronization resumed locally/i)).toBeVisible();
});

test('sanitized diagnostics are user-generated and previewable', async ({ page }) => {
  await page.goto('/app/diagnostics/');
  await page.getByRole('button', { name: 'Generate diagnostic preview' }).click();
  const preview = page.getByTestId('diagnostic-preview');
  await expect(preview).toContainText('SREADYA-DIAGNOSTIC');
  await expect(preview).not.toContainText('SYNTHETIC_PRODUCT_COMPLETENESS_NOTE');
});
