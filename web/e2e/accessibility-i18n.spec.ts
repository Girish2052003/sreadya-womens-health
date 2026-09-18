import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const SETTINGS_URL = '/app/settings/';

async function hasHorizontalOverflow(page: import('@playwright/test').Page): Promise<boolean> {
  return page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    return Math.max(root.scrollWidth, body.scrollWidth) > root.clientWidth + 1;
  });
}

test('accessibility preferences apply immediately and persist locally', async ({ page }) => {
  const offOriginRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:3000') offOriginRequests.push(request.url());
  });

  await page.goto(SETTINGS_URL);
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  await expect(page.getByTestId('accessibility-preferences')).toBeVisible();

  await page.getByLabel('Large').check();
  await page.getByLabel('Reduce motion').check();
  await page.getByLabel('High contrast').check();
  await page.getByRole('radio', { name: 'Easy language' }).check();

  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-sreadya-text-scale', 'large');
  await expect(root).toHaveAttribute('data-sreadya-motion', 'reduced');
  await expect(root).toHaveAttribute('data-sreadya-contrast', 'high');
  await expect(root).toHaveAttribute('data-sreadya-language-mode', 'easy');
  await expect(page.getByLabel('Easy language guide')).toBeVisible();

  await page.getByRole('button', { name: 'Save accessibility preferences' }).click();
  await expect(page.getByRole('status')).toContainText('Accessibility preferences saved on this device.');

  const stored = await page.evaluate(() => localStorage.getItem('sreadya:accessibility:v1'));
  expect(JSON.parse(stored!)).toEqual({
    version: 1,
    textScale: 'large',
    motion: 'reduced',
    contrast: 'high',
    easyLanguage: true,
  });

  await page.reload();
  await expect(page.getByLabel('Large')).toBeChecked();
  await expect(page.getByLabel('Reduce motion')).toBeChecked();
  await expect(page.getByLabel('High contrast')).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Easy language' })).toBeChecked();
  await expect(root).toHaveAttribute('data-sreadya-text-scale', 'large');
  await expect(root).toHaveAttribute('data-sreadya-motion', 'reduced');
  await expect(root).toHaveAttribute('data-sreadya-contrast', 'high');
  await expect(root).toHaveAttribute('data-sreadya-language-mode', 'easy');
  await expect(page.getByLabel('Easy language guide')).toBeVisible();
  expect(offOriginRequests).toEqual([]);
});

test('keyboard focus, 200 percent reflow, large text, RTL and long-copy fixtures stay usable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(SETTINGS_URL);

  let focusEvidence: { tagName: string; outlineStyle: string; outlineWidth: string } | null = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await page.keyboard.press('Tab');
    focusEvidence = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      if (!active || !['A', 'BUTTON', 'INPUT'].includes(active.tagName)) return null;
      const style = getComputedStyle(active);
      return {
        tagName: active.tagName,
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
      };
    });
    if (focusEvidence) break;
  }
  expect(focusEvidence).not.toBeNull();
  expect(['A', 'BUTTON', 'INPUT']).toContain(focusEvidence!.tagName);
  expect(focusEvidence!.outlineStyle).not.toBe('none');
  expect(Number.parseFloat(focusEvidence!.outlineWidth)).toBeGreaterThanOrEqual(2);

  expect(await hasHorizontalOverflow(page)).toBe(false);

  await page.getByLabel('Large').check();
  const rootFontSize = await page.locator('html').evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  expect(rootFontSize).toBeGreaterThanOrEqual(20);
  expect(await hasHorizontalOverflow(page)).toBe(false);

  await page.getByLabel('Formatting locale').fill('ar-EG');
  await page.getByRole('button', { name: 'Save general settings' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar-EG');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

  await page.evaluate(() => {
    const title = document.querySelector('[data-testid="accessibility-preferences"] h2');
    if (title) title.textContent = Array.from({ length: 9 }, () => 'Long localized accessibility preference wording').join(' ');
  });
  expect(await hasHorizontalOverflow(page)).toBe(false);
});

test('system reduced motion remains honored and explicit high contrast strengthens presentation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const transitionDurations = await page.locator('.public-header__cta').evaluate((element) =>
    getComputedStyle(element).transitionDuration
      .split(',')
      .map((duration) => Number.parseFloat(duration)),
  );
  expect(transitionDurations.length).toBeGreaterThan(0);
  expect(transitionDurations.every((seconds) => seconds <= 0.00001)).toBe(true);

  await page.goto(SETTINGS_URL);
  await page.getByLabel('High contrast').check();
  const contrast = await page.getByTestId('accessibility-preferences').evaluate((element) => ({
    muted: getComputedStyle(document.documentElement).getPropertyValue('--sreadya-muted').trim(),
    resolvedBorderColor: getComputedStyle(element).borderTopColor,
  }));
  expect(contrast.muted).toBe('#3d3035');
  expect(contrast.resolvedBorderColor).toBe('rgba(38, 25, 30, 0.38)');
});

test('Settings passes automated WCAG 2.2 AA-targeted axe review', async ({ page }) => {
  await page.goto(SETTINGS_URL);
  await expect(page.getByTestId('accessibility-preferences')).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});
