import { expect, test } from '@playwright/test';

test('manifest identifies Sreva as a standalone account-free Web app', async ({ request }) => {
  const response = await request.get('/manifest.webmanifest');
  expect(response.ok()).toBeTruthy();
  const manifest = await response.json();

  expect(manifest.name).toBe('Sreva');
  expect(manifest.short_name).toBe('Sreva');
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toContain('app/home');
  expect(manifest.scope).toBe('./');
});

test('service worker keeps health workspace responses out of Cache Storage and supplies an offline shell', async ({ page, context }) => {
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

  await context.setOffline(true);
  await page.goto('/app/home/');
  await expect(page.getByRole('heading', { name: 'Sreva works offline' })).toBeVisible();
  await expect(page.getByText('Your private health records are not stored in this offline page.')).toBeVisible();
  await context.setOffline(false);
});

test('reviewed install guidance is explicit for iPhone and Android', async ({ page }) => {
  await page.goto('/install/iphone/');
  await expect(page.getByRole('heading', { level: 2, name: 'Install Sreva on iPhone' })).toBeVisible();
  await expect(page.getByText('Add to Home Screen')).toBeVisible();

  await page.goto('/install/android/');
  await expect(page.getByRole('heading', { level: 2, name: 'Install Sreva on Android' })).toBeVisible();
  await expect(page.getByText('Install app')).toBeVisible();
});
