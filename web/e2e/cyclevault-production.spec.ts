import { readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

const vector = JSON.parse(
  readFileSync(
    new URL('../../shared/crypto/interoperability-vectors/cyclevault-v1.json', import.meta.url),
    'utf8',
  ),
) as {
  passphrase: string;
  containerJson: string;
};

type StoredRecordSnapshot = {
  ids: string[];
  serialized: string;
};

async function storedHealthSnapshot(page: import('@playwright/test').Page): Promise<StoredRecordSnapshot> {
  return page.evaluate(async () => new Promise<StoredRecordSnapshot>((resolve, reject) => {
    const request = indexedDB.open('sreva-vault-v1');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('records', 'readonly');
      const recordsRequest = transaction.objectStore('records').getAll();
      recordsRequest.onerror = () => reject(recordsRequest.error);
      recordsRequest.onsuccess = () => {
        const records = recordsRequest.result as Array<{ id: string; sealed: unknown }>;
        resolve({
          ids: records.map((record) => record.id).sort(),
          serialized: JSON.stringify(records),
        });
        database.close();
      };
    };
  }));
}

test('CycleVault production restore/export remains account-free, local and atomic', async ({ page }) => {
  const offOriginRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:3000') offOriginRequests.push(request.url());
  });

  await page.goto('/app/vault/');
  await expect(page.getByTestId('cyclevault-workspace')).toBeVisible();
  await expect(page.getByText('Account-free · encrypted locally · nothing is uploaded to Sreva')).toBeVisible();
  await expect(page.getByText('Encrypted local vault ready')).toBeVisible();

  const restoreButton = page.getByRole('button', { name: 'Replace local health data' });
  await expect(restoreButton).toBeDisabled();

  const fileInput = page.getByLabel('CycleVault recovery file');
  await fileInput.setInputFiles({
    name: 'independent-vector.cyclevault',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from(vector.containerJson, 'utf8'),
  });
  await expect(page.getByText('CycleVault file selected. Nothing has been restored yet.')).toBeVisible();
  await page.getByLabel('CycleVault restore passphrase').fill(vector.passphrase);
  await expect(restoreButton).toBeDisabled();
  await page.getByLabel('Acknowledge CycleVault replacement').check();
  await expect(restoreButton).toBeEnabled();
  await restoreButton.click();
  await expect(page.getByText('CycleVault restored locally: 1 period record(s), 1 observation(s).')).toBeVisible({ timeout: 30_000 });

  const restored = await storedHealthSnapshot(page);
  expect(restored.ids).toContain('health:period:p-vector-1');
  expect(restored.ids).toContain('health:observation:o-vector-1');
  expect(restored.serialized).not.toContain('2026-08-01T00:00:00.000Z');
  expect(restored.serialized).not.toContain('Cramps');

  await fileInput.setInputFiles([]);
  await fileInput.setInputFiles({
    name: 'independent-vector.cyclevault',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from(vector.containerJson, 'utf8'),
  });
  await page.getByLabel('CycleVault restore passphrase').fill('definitely-wrong-passphrase');
  await page.getByLabel('Acknowledge CycleVault replacement').check();
  await restoreButton.click();
  await expect(page.locator('p.core-error[role="alert"]')).toContainText(
    'existing local health data was preserved',
    { timeout: 30_000 },
  );
  const afterWrongPassphrase = await storedHealthSnapshot(page);
  expect(afterWrongPassphrase.ids).toEqual(restored.ids);
  expect(afterWrongPassphrase.serialized).toEqual(restored.serialized);

  const exportPassphrase = 'fresh browser backup passphrase';
  await page.getByLabel('CycleVault export passphrase').fill(exportPassphrase);
  await page.getByLabel('Confirm CycleVault export passphrase').fill(exportPassphrase);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download encrypted backup' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^sreva-.*\.cyclevault$/);
  const path = await download.path();
  expect(path).not.toBeNull();
  const exported = readFileSync(path!, 'utf8');
  const outer = JSON.parse(exported) as { manifest: { format: string; formatVersion: number }; salt: string; sealedPayload: string };
  expect(outer.manifest.format).toBe('SREVA-CYCLEVAULT');
  expect(outer.manifest.formatVersion).toBe(1);
  expect(outer.salt.length).toBeGreaterThan(0);
  expect(outer.sealedPayload.length).toBeGreaterThan(0);
  expect(exported).not.toContain('2026-08-01T00:00:00.000Z');
  expect(exported).not.toContain('Cramps');

  expect(offOriginRequests).toEqual([]);
});
