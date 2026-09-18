import { expect, test, type Page } from '@playwright/test';

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

function observeRemoteRequests(page: Page): string[] {
  const remoteRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') remoteRequests.push(request.url());
  });
  return remoteRequests;
}

async function readVaultRecord(page: Page, id: string) {
  return page.evaluate(async (recordId) => new Promise<PersistedVaultRecord | undefined>((resolve, reject) => {
    const request = indexedDB.open('sreva-vault-v1');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('records', 'readonly');
      const getRequest = transaction.objectStore('records').get(recordId);
      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => resolve(getRequest.result as PersistedVaultRecord | undefined);
    };
  }), id);
}

test('Task 13 workspaces are account-free, local-first and truthful', async ({ page }) => {
  const remoteRequests = observeRemoteRequests(page);
  const routes = [
    ['life-stage', 'Life Stage'],
    ['insights', 'Insights'],
    ['reports', 'Reports'],
    ['assistant', 'Assistant'],
    ['sharing', 'Sharing'],
    ['privacy', 'Privacy'],
  ] as const;

  for (const [route, heading] of routes) {
    await page.goto(`/app/${route}/`);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(page.getByText('Encrypted local vault ready')).toBeVisible();
    await expect(page.getByText(/Account-free/).first()).toBeVisible();
    await expect(page.getByText('Sign in required')).toHaveCount(0);
  }

  await expect(page.getByText('Remote continuity endpoint not configured')).toBeVisible();
  await expect(page.getByText(/PIN app lock available but not configured/)).toBeVisible();
  await expect(page.getByText(/native biometric protection not claimed/)).toBeVisible();
  await expect(page.getByText(/Browser controlled — no Web guarantee/)).toBeVisible();
  expect(remoteRequests).toEqual([]);
});

test('doctor report requires an explicit local preview and keeps sensitive categories opt-in', async ({ page }) => {
  const remoteRequests = observeRemoteRequests(page);
  await page.goto('/app/reports/');
  await expect(page.getByText('Encrypted local vault ready')).toBeVisible();

  await expect(page.getByLabel('Private notes')).not.toBeChecked();
  await expect(page.getByLabel('Sexual activity')).not.toBeChecked();
  await expect(page.getByRole('button', { name: 'Download CSV' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Download PDF' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Preview report' }).click();
  await expect(page.getByTestId('report-preview')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download CSV' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download PDF' })).toBeVisible();
  expect(remoteRequests).toEqual([]);
});

test('partner sharing renders a reviewed QR locally and stores the grant only as ciphertext', async ({ page }) => {
  const remoteRequests = observeRemoteRequests(page);
  await page.goto('/app/sharing/');
  await expect(page.getByText('Encrypted local vault ready')).toBeVisible();

  await page.getByLabel('Expected period window').uncheck();
  await page.getByLabel('Cycle phase / cycle day').check();
  await page.getByLabel('Cycle phase or day').fill('Cycle day 12');
  await page.getByRole('button', { name: 'Create reviewed preview' }).click();

  await expect(page.getByTestId('partner-share-preview')).toContainText('Cycle day 12');
  await expect(page.getByTestId('partner-share-qr').locator('svg')).toBeVisible();
  await expect(page.getByText(/No QR service receives it/)).toBeVisible();
  await expect(page.getByText(/Sexual activity, private notes, fertility tests and pregnancy data are not partner-sharing categories/)).toBeVisible();

  const stored = await readVaultRecord(page, 'sharing:partner-grants:v1');
  expect(stored).toBeTruthy();
  expect(stored!.sealed.algorithm).toBe('AES-GCM');
  const serialized = JSON.stringify(stored);
  expect(serialized).not.toContain('Cycle day 12');
  expect(serialized).not.toContain('cyclePhase');

  await page.getByRole('button', { name: 'Revoke local grant' }).click();
  await expect(page.getByText('Local sharing grant revoked')).toBeVisible();
  await expect(page.getByTestId('partner-share-qr')).toHaveCount(0);
  expect(remoteRequests).toEqual([]);
});

test('private assistant parses locally and asks before mutating encrypted health history', async ({ page }) => {
  const remoteRequests = observeRemoteRequests(page);
  await page.goto('/app/assistant/');
  await expect(page.getByText('Encrypted local vault ready')).toBeVisible();
  await expect(page.getByText(/deterministic local parser · no cloud LLM/)).toBeVisible();

  await page.getByLabel('Private command').fill('My period started yesterday');
  await page.getByRole('button', { name: 'Understand locally' }).click();
  await expect(page.getByText('Intent:')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm local action' })).toBeVisible();

  await page.getByRole('button', { name: 'Confirm local action' }).click();
  await expect(page.getByText('Saved locally · encrypted')).toBeVisible();
  expect(remoteRequests).toEqual([]);
});
