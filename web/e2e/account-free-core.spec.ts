import { expect, test } from '@playwright/test';

type Manifest = {
  start_url?: string;
};

type PersistedVaultRecord = {
  id: string;
  sealed: {
    version: number;
    algorithm: string;
    nonce: string;
    aad: string;
    ciphertext: string;
  };
};

async function readPeriodRecords(page: import('@playwright/test').Page) {
  return page.evaluate(async () => new Promise<PersistedVaultRecord[]>((resolve, reject) => {
    const request = indexedDB.open('sreva-vault-v1');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('records', 'readonly');
      const allRequest = transaction.objectStore('records').getAll();
      allRequest.onerror = () => reject(allRequest.error);
      allRequest.onsuccess = () => {
        const rows = allRequest.result as PersistedVaultRecord[];
        resolve(rows.filter((row) => row.id.startsWith('health:period:')));
      };
    };
  }));
}

test('account-free period survives an offline refresh while IndexedDB remains ciphertext-only', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) throw new Error('Service worker unavailable');
    await navigator.serviceWorker.ready;
  });
  await page.reload();

  const manifest = await page.evaluate(async () => {
    const response = await fetch('/manifest.webmanifest');
    return response.json() as Promise<Manifest>;
  });
  expect(manifest.start_url).toContain('app/home');

  await page.goto(manifest.start_url!);
  await expect(page.getByText('Encrypted local vault ready')).toBeVisible();
  await expect(page.getByText(/Account-free · no health telemetry · local authoritative data/)).toBeVisible();

  await page.goto('/app/cycle/');
  await expect(page.getByText('Encrypted local vault ready')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cycle & periods' })).toBeVisible();

  await context.setOffline(true);
  await page.getByRole('button', { name: 'Period started today' }).click();
  await expect(page.getByText('Saved locally · encrypted')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your recorded periods' })).toBeVisible();

  const localDate = await page.evaluate(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const periodRows = await readPeriodRecords(page);
  expect(periodRows).toHaveLength(1);
  expect(periodRows[0].sealed.version).toBe(1);
  expect(periodRows[0].sealed.algorithm).toBe('AES-GCM');
  const serialized = JSON.stringify(periodRows[0]);
  expect(serialized).not.toContain(localDate);
  expect(serialized).not.toContain('"source":"app"');

  await page.reload();

  await expect(page.getByRole('heading', { name: 'Cycle & periods' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your recorded periods' })).toBeVisible();
  await expect(page.getByText(localDate.replace(/-/g, ' '))).not.toBeVisible();

  const reloadedPeriodRows = await readPeriodRecords(page);
  expect(reloadedPeriodRows).toHaveLength(1);
  expect(JSON.stringify(reloadedPeriodRows[0])).not.toContain(localDate);

  await context.setOffline(false);
});
