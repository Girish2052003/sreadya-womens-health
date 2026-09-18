import { expect, test } from '@playwright/test';

test('manifest identifies Sreadya as a standalone account-free Web app', async ({ request }) => {
  const response = await request.get('/manifest.webmanifest');
  expect(response.ok()).toBeTruthy();
  const manifest = await response.json();

  expect(manifest.name).toBe('Sreadya');
  expect(manifest.short_name).toBe('Sreadya');
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toContain('app/home');
  expect(manifest.scope).toBe('./');
});

test('service worker keeps health workspace responses out of Cache Storage', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) throw new Error('Service worker unavailable');
    await navigator.serviceWorker.ready;
  });
  await page.reload();

  const cachedAppRequests = await page.evaluate(async () => {
    await fetch('/app/privacy/');
    const cacheNames = await caches.keys();
    const urls: string[] = [];
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      urls.push(...requests.map((request) => new URL(request.url).pathname));
    }
    return urls.filter((pathname) => pathname.startsWith('/app/'));
  });
  expect(cachedAppRequests).toEqual([]);
});

test('service worker supplies the reviewed offline shell in Chromium', async ({ page, context, browserName }) => {
  test.skip(
    browserName !== 'chromium',
    'Playwright forced-offline service-worker navigation is not deterministic in Firefox or WebKit; cross-browser cache privacy remains verified separately.',
  );

  await page.goto('/');
  await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) throw new Error('Service worker unavailable');
    await navigator.serviceWorker.ready;
  });
  await page.reload();

  await context.setOffline(true);
  await page.goto('/app/home/');
  await expect(page.getByRole('heading', { name: 'Sreadya works offline' })).toBeVisible();
  await expect(page.getByText('Your private health records are not stored in this offline page.')).toBeVisible();
  await context.setOffline(false);
});

test('reviewed install guidance is explicit for iPhone and Android', async ({ page }) => {
  await page.goto('/install/iphone/');
  await expect(page.getByRole('heading', { level: 2, name: 'Install Sreadya on iPhone' })).toBeVisible();
  await expect(page.getByText('Add to Home Screen')).toBeVisible();

  await page.goto('/install/android/');
  await expect(page.getByRole('heading', { level: 2, name: 'Install Sreadya on Android' })).toBeVisible();
  await expect(page.getByText('Install app')).toBeVisible();
});


test('selected language bundle is cached as a static globalization artifact', async ({ page, request }) => {
  const manifestResponse = await request.get('/i18n/manifest.json');
  expect(manifestResponse.ok()).toBeTruthy();
  const globalizationManifest = await manifestResponse.json() as {
    publicLocales?: Array<{ tag?: string }>;
  };
  const arabicPublished = globalizationManifest.publicLocales?.some(
    (locale) => locale.tag?.toLowerCase() === 'ar',
  ) ?? false;
  test.skip(
    !arabicPublished,
    'Arabic is intentionally not selectable until the complete Google-generated bundle is published.',
  );

  await page.goto('/');
  await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) throw new Error('Service worker unavailable');
    await navigator.serviceWorker.ready;
  });
  await page.reload();

  await page.getByTestId('language-chooser-trigger').click();
  await page.getByTestId('language-chooser-search').fill('Arabic');
  await page.locator('[data-language-tag="ar"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('html')).toHaveAttribute('data-sreadya-text-direction', 'rtl');

  const languageAssets = await page.evaluate(async () => {
    const names = await caches.keys();
    const urls: string[] = [];
    for (const name of names.filter((candidate) => candidate.startsWith('sreadya-i18n-'))) {
      const cache = await caches.open(name);
      const requests = await cache.keys();
      urls.push(...requests.map((request) => new URL(request.url).pathname));
    }
    return urls;
  });

  expect(languageAssets.some((pathname) => /\/i18n\/ar\.[a-f0-9]{16}\.json$/.test(pathname))).toBe(true);
});
