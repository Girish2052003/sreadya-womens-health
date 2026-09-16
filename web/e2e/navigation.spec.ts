import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('public navigation supports deep links, history and an accessible landing surface', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Sreva' })).toBeVisible();
  await page.getByRole('link', { name: 'Features' }).click();
  await expect(page).toHaveURL(/\/features\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Features' })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('private workspace deep links expose the calm five-item primary navigation', async ({ page }) => {
  await page.goto('/app/home/');
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Sreva workspace' });
  for (const item of ['Home', 'Today', 'Log', 'Calendar', 'More']) {
    await expect(nav.getByRole('link', { name: item, exact: true })).toBeVisible();
  }

  await page.goto('/app/privacy/');
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy' })).toBeVisible();
});
