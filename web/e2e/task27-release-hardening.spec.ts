import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const criticalRoutes = [
  '/',
  '/app/home/',
  '/app/recovery/',
  '/app/settings/',
  '/app/sync/',
];

for (const route of criticalRoutes) {
  test(`Task 27 WCAG 2.2 AA automated scan has no serious violations on ${route}`, async ({ page }) => {
    await page.goto(route);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(result.violations).toEqual([]);
  });
}

test('Task 27 primary settings action keeps a 44 by 44 CSS pixel touch target', async ({ page }) => {
  await page.goto('/app/settings/');
  const save = page.getByRole('button', { name: 'Save accessibility preferences' });
  const box = await save.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
});

test('Task 27 settings save exposes an announced status region', async ({ page }) => {
  await page.goto('/app/settings/');
  await page.getByLabel('Large').check();
  await page.getByRole('button', { name: 'Save accessibility preferences' }).click();

  // role=status supplies the ARIA implicit aria-live="polite" announcement contract.
  const status = page.getByRole('status');
  await expect(status).toBeVisible();
  await expect(status).toContainText(/saved/i);
});

test('Task 27 service worker cache never stores recovery, API, or sync responses', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Cache Storage/service worker introspection is deterministic in Chromium.');

  await page.goto('/');
  await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) throw new Error('Service worker unavailable');
    await navigator.serviceWorker.ready;
  });
  await page.reload();

  await page.evaluate(async () => {
    await Promise.allSettled([
      fetch('/app/recovery/'),
      fetch('/api/task27-synthetic'),
      fetch('/sync/task27-synthetic'),
    ]);
  });

  const cached = await page.evaluate(async () => {
    const paths: string[] = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) paths.push(new URL(request.url).pathname);
    }
    return paths;
  });

  expect(cached.some((path) => path.includes('/app/recovery'))).toBe(false);
  expect(cached.some((path) => path.includes('/api/'))).toBe(false);
  expect(cached.some((path) => path.includes('/sync/'))).toBe(false);
});
