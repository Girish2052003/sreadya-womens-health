import { expect, test, type Page } from '@playwright/test';

const LIVE_ROOT = process.env.SREVA_LIVE_BASE_URL ?? 'https://girish2052003.github.io/sreva-womens-health/';
const LIVE_ORIGIN = new URL(LIVE_ROOT).origin;
const SYNTHETIC_NOTE = 'Task18 synthetic private note 8F2A';

function live(path = ''): string {
  return new URL(path.replace(/^\/+/, ''), LIVE_ROOT).toString();
}

function dateKey(date: Date): string {
  return [
    date.getUTCFullYear().toString().padStart(4, '0'),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function offsetDate(days: number): string {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKey(date);
}

async function addHistoricalPeriod(page: Page, start: string, end: string) {
  const cards = page.locator('.core-period-card');
  const before = await cards.count();
  await page.getByRole('button', { name: 'Period started today' }).click();
  await expect(cards).toHaveCount(before + 1);

  const newest = cards.first();
  await newest.locator('input[name="start"]').fill(start);
  await newest.locator('input[name="end"]').fill(end);
  await newest.getByRole('button', { name: 'Save dates' }).click();
  await expect(page.locator('.core-error[role="alert"]')).toHaveCount(0);
}

test('Task 18 live production desktop/account-free acceptance preflight', async ({ page, context, request }) => {
  test.setTimeout(180_000);

  const observedRequests: Array<{ url: string; postData: string | null }> = [];
  page.on('request', (entry) => observedRequests.push({ url: entry.url(), postData: entry.postData() }));

  const manifestResponse = await request.get(live('manifest.webmanifest'));
  expect(manifestResponse.ok()).toBeTruthy();
  const manifest = await manifestResponse.json() as { name: string; display: string; start_url: string; scope: string };
  expect(manifest.name).toBe('Sreva');
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBe('./app/home/');
  expect(manifest.scope).toBe('./');

  await page.goto(live());
  await expect(page.getByRole('heading', { level: 1, name: 'Sreva' })).toBeVisible();
  const continuePrivately = page.getByRole('link', { name: 'Continue without an account' });
  await expect(continuePrivately).toBeVisible();
  await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) throw new Error('Service worker unavailable');
    await navigator.serviceWorker.ready;
  });
  await Promise.all([
    page.waitForURL(live('app/home/')),
    continuePrivately.click(),
  ]);
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
  await expect(page.getByText('Encrypted local vault ready')).toBeVisible();
  await expect(page.getByText(/Account-free · no health telemetry · local authoritative data/)).toBeVisible();
  await expect(page.getByText('Sign in required')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Encrypted local vault ready')).toBeVisible();

  await page.goto(live('install/iphone/'));
  await expect(page.getByRole('heading', { level: 2, name: 'Install Sreva on iPhone' })).toBeVisible();
  await expect(page.getByText('Add to Home Screen')).toBeVisible();

  await page.goto(live('app/home/'));
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
  await expect(page.getByText('Encrypted local vault ready')).toBeVisible();
  await expect(page.getByText(/Account-free · no health telemetry · local authoritative data/)).toBeVisible();
  await expect(page.getByText('Sign in required')).toHaveCount(0);

  await page.goto(live('app/cycle/'));
  await expect(page.getByText('Encrypted local vault ready')).toBeVisible();
  const starts = [-85, -57, -29, -1].map(offsetDate);
  for (const start of starts) {
    const endDate = new Date(`${start}T12:00:00Z`);
    endDate.setUTCDate(endDate.getUTCDate() + 4);
    await addHistoricalPeriod(page, start, dateKey(endDate));
  }
  await expect(page.getByRole('heading', { name: 'Your recorded periods' })).toBeVisible();

  await page.goto(live('app/predictions/'));
  await expect(page.getByText('Encrypted local vault ready')).toBeVisible();
  await expect(page.getByText('Most likely date')).toBeVisible();
  await expect(page.getByText('Expected range')).toBeVisible();
  await expect(page.getByText('Confidence')).toBeVisible();
  await expect(page.getByText(/This is an estimate, not a guarantee or diagnosis/)).toBeVisible();

  await page.goto(live('app/reminders/'));
  await expect(page.getByText('Encrypted local vault ready')).toBeVisible();
  await page.getByLabel('3 days before').check();
  await page.getByRole('radio', { name: /Balanced/ }).check();
  await page.getByRole('button', { name: 'Save reminder settings' }).click();
  await expect(page.getByText('Saved locally · encrypted')).toBeVisible();
  await expect(page.getByText(/Closed-app delivery is not guaranteed/)).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('3 days before')).toBeChecked();
  await expect(page.getByRole('radio', { name: /Balanced/ })).toBeChecked();

  await page.goto(live('app/log/'));
  await expect(page.getByText('Encrypted local vault ready')).toBeVisible();
  await page.getByLabel('Optional private note').fill(SYNTHETIC_NOTE);
  await page.getByRole('button', { name: 'Save local observation' }).click();
  await expect(page.getByText('Saved locally · encrypted')).toBeVisible();
  await expect(page.getByText(SYNTHETIC_NOTE)).toBeVisible();

  await page.goto(live('app/today/'));
  await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
  await expect(page.getByText('Encrypted local vault ready')).toBeVisible();

  await page.goto(live('app/calendar/'));
  await expect(page.getByRole('heading', { name: 'Calendar & history' })).toBeVisible();
  await page.getByRole('button', { name: 'Timeline' }).click();
  await expect(page.getByRole('heading', { name: 'Period-day timeline' })).toBeVisible();

  await page.goto(live('app/insights/'));
  await expect(page.getByRole('heading', { level: 1, name: 'Insights' })).toBeVisible();
  await expect(page.getByText('Encrypted local vault ready')).toBeVisible();
  await expect(page.getByText('Calculated in this browser from the encrypted local vault.')).toBeVisible();

  await page.goto(live('app/reports/'));
  await expect(page.getByText('Encrypted local vault ready')).toBeVisible();
  await page.getByRole('button', { name: 'Preview report' }).click();
  await expect(page.getByTestId('report-preview')).toBeVisible();
  const reportDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSV' }).click();
  const report = await reportDownload;
  expect(report.suggestedFilename()).toBe('sreva-health-report.csv');
  expect(await report.path()).not.toBeNull();

  await page.goto(live('app/privacy/'));
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy' })).toBeVisible();
  await expect(page.getByText('Encrypted local vault ready')).toBeVisible();
  await expect(page.getByText('Privacy center')).toBeVisible();
  await expect(page.getByText('Truthful boundary')).toBeVisible();
  await expect(page.getByText('Platform health access').locator('..')).toContainText('Not connected');
  await expect(page.getByText(/HealthKit (connected|enabled|synced)/i)).toHaveCount(0);

  await page.goto(live('app/vault/'));
  await expect(page.getByTestId('cyclevault-workspace')).toBeVisible();
  await expect(page.getByText('Encrypted local vault ready')).toBeVisible();
  const backupPassphrase = 'Task18 synthetic backup passphrase';
  await page.getByLabel('CycleVault export passphrase', { exact: true }).fill(backupPassphrase);
  await page.getByLabel('Confirm CycleVault export passphrase').fill(backupPassphrase);
  const vaultDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download encrypted backup' }).click();
  const vaultDownload = await vaultDownloadPromise;
  expect(vaultDownload.suggestedFilename()).toMatch(/^sreva-.*\.cyclevault$/);
  const vaultPath = await vaultDownload.path();
  expect(vaultPath).not.toBeNull();

  await page.getByLabel('CycleVault recovery file').setInputFiles(vaultPath!);
  await expect(page.getByText('CycleVault file selected. Nothing has been restored yet.')).toBeVisible();
  await page.getByLabel('CycleVault restore passphrase').fill(backupPassphrase);
  await page.getByLabel('Acknowledge CycleVault replacement').check();
  await page.getByRole('button', { name: 'Replace local health data' }).click();
  await expect(page.getByText(/CycleVault restored locally:/)).toBeVisible({ timeout: 30_000 });

  await page.goto(live('app/home/'));
  await expect(page.getByText('Encrypted local vault ready')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Encrypted local vault ready')).toBeVisible();
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
  await expect(page.getByText('Encrypted local vault ready')).toBeVisible();
  await context.setOffline(false);

  const cachedBodies = await page.evaluate(async () => {
    const chunks: string[] = [];
    for (const cacheName of await caches.keys()) {
      const cache = await caches.open(cacheName);
      for (const cachedRequest of await cache.keys()) {
        chunks.push(cachedRequest.url);
        const response = await cache.match(cachedRequest);
        if (response) chunks.push(await response.clone().text());
      }
    }
    return chunks.join('\n');
  });

  const sensitiveSentinels = [SYNTHETIC_NOTE, ...starts];
  for (const sentinel of sensitiveSentinels) {
    expect(cachedBodies).not.toContain(sentinel);
    for (const observed of observedRequests) {
      expect(observed.url).not.toContain(sentinel);
      expect(observed.postData ?? '').not.toContain(sentinel);
    }
  }

  for (const observed of observedRequests) {
    expect(new URL(observed.url).origin).toBe(LIVE_ORIGIN);
  }
});
