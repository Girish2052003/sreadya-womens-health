import { expect, test } from '@playwright/test';

function channel(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function contrastRatio(foreground: string, background: string): number {
  const parse = (rgb: string) => {
    const values = rgb.match(/[\d.]+/g)?.slice(0, 3).map(Number);
    if (!values || values.length !== 3) throw new Error(`Unable to parse color: ${rgb}`);
    const luminance = 0.2126 * channel(values[0]) + 0.7152 * channel(values[1]) + 0.0722 * channel(values[2]);
    return luminance;
  };
  const first = parse(foreground);
  const second = parse(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

test('public appearance control switches and persists System, Light and Dark', async ({ page }) => {
  await page.goto('/');
  const appearance = page.getByRole('group', { name: 'Appearance' });
  await expect(appearance).toBeVisible();
  await expect(page.getByRole('button', { name: 'System theme' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Light theme' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dark theme' })).toBeVisible();

  await page.getByRole('button', { name: 'Dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-sreva-theme', 'dark');

  const storedDark = await page.evaluate(() => JSON.parse(localStorage.getItem('sreva:general-settings:v1') ?? '{}'));
  expect(storedDark.theme).toBe('dark');

  await page.goto('/features/');
  await expect(page.locator('html')).toHaveAttribute('data-sreva-theme', 'dark');

  await page.getByRole('button', { name: 'Light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-sreva-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-sreva-theme', 'light');

  await page.getByRole('button', { name: 'System theme' }).click();
  const storedSystem = await page.evaluate(() => JSON.parse(localStorage.getItem('sreva:general-settings:v1') ?? '{}'));
  expect(storedSystem.theme).toBe('system');
});

test('dark mode preserves readable text on deliberately light surfaces', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Dark theme' }).click();
  await page.goto('/features/');

  const firstCapability = page.locator('.capability-catalogue__item').first();
  await expect(firstCapability).toBeVisible();

  const ratios = await firstCapability.evaluate((item) => {
    const title = item.querySelector('strong');
    const detail = item.querySelector('small');
    if (!title || !detail) throw new Error('Capability text missing');
    const background = getComputedStyle(item).backgroundColor;
    return {
      titleColor: getComputedStyle(title).color,
      detailColor: getComputedStyle(detail).color,
      background,
    };
  });

  expect(contrastRatio(ratios.titleColor, ratios.background)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(ratios.detailColor, ratios.background)).toBeGreaterThanOrEqual(4.5);
});
