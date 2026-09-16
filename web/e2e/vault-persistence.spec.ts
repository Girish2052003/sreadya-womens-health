import { expect, test } from '@playwright/test';

const recordId = 'sreva-e2e-vault-record';
const sentinel = 'KNOWN-PLAINTEXT-SENTINEL';

async function readRawRecord(page: import('@playwright/test').Page) {
  return page.evaluate(async (id) => new Promise<Record<string, unknown>>((resolve, reject) => {
    const request = indexedDB.open('sreva-vault-v1');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('records', 'readonly');
      const getRequest = transaction.objectStore('records').get(id);
      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => resolve(getRequest.result as Record<string, unknown>);
    };
  }), id);
}

test('IndexedDB contains ciphertext only and a non-extractable WebCrypto key', async ({ page }) => {
  await page.goto('/app/vault/');
  await expect(page.getByTestId('vault-test-harness')).toBeVisible();
  await expect(page.getByText(/Browser site data can be erased/i)).toBeVisible();
  await expect(page.getByText(/browser storage is not presented as equivalent to secure hardware/i)).toBeVisible();

  await page.getByLabel('Verification payload').fill(JSON.stringify({
    note: sentinel,
    periodStart: '2099-12-31',
    flow: 'heavy',
  }));
  await page.getByRole('button', { name: 'Seal test record' }).click();
  await expect(page.getByTestId('vault-test-result')).toHaveText('sealed');

  const raw = await readRawRecord(page);
  const serialized = JSON.stringify(raw);
  expect(serialized).not.toContain(sentinel);
  expect(serialized).not.toContain('2099-12-31');
  expect(serialized).not.toContain('heavy');
  expect(serialized).toContain('AES-GCM');

  const keyMetadata = await page.evaluate(async () => new Promise<{ extractable: boolean; algorithm: string; usages: string[] }>((resolve, reject) => {
    const request = indexedDB.open('sreva-vault-v1');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('keys', 'readonly');
      const getRequest = transaction.objectStore('keys').get('primary');
      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        const key = (getRequest.result as { key: CryptoKey }).key;
        resolve({ extractable: key.extractable, algorithm: key.algorithm.name, usages: [...key.usages] });
      };
    };
  }));
  expect(keyMetadata).toEqual({ extractable: false, algorithm: 'AES-GCM', usages: ['encrypt', 'decrypt'] });

  await page.reload();
  await page.getByRole('button', { name: 'Read test record' }).click();
  await expect(page.getByTestId('vault-test-result')).toContainText(sentinel);
});

test('tamper and wrong-key paths fail closed while lock clears the live session', async ({ page }) => {
  await page.goto('/app/vault/');
  await expect(page.getByTestId('vault-test-harness')).toBeVisible();
  await page.getByRole('button', { name: 'Seal test record' }).click();
  await expect(page.getByTestId('vault-test-result')).toHaveText('sealed');

  await page.getByRole('button', { name: 'Lock test vault' }).click();
  await expect(page.getByTestId('vault-test-result')).toHaveText('locked');
  await page.getByRole('button', { name: 'Read test record' }).click();
  await expect(page.getByTestId('vault-test-result')).toContainText(sentinel);

  const original = await readRawRecord(page);
  await page.evaluate(async ({ id }) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('sreva-vault-v1');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('records', 'readwrite');
      const store = transaction.objectStore('records');
      const getRequest = store.get(id);
      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        const row = getRequest.result as { sealed: { ciphertext: string } };
        const current = row.sealed.ciphertext;
        row.sealed.ciphertext = `${current[0] === 'A' ? 'B' : 'A'}${current.slice(1)}`;
        store.put(row);
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
  }), { id: recordId });

  await page.reload();
  await page.getByRole('button', { name: 'Read test record' }).click();
  await expect(page.getByTestId('vault-test-result')).toHaveText('Vault read failed');

  await page.evaluate(async ({ id, row }) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('sreva-vault-v1');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['records', 'keys'], 'readwrite');
      transaction.objectStore('records').put(row);
      transaction.objectStore('keys').delete('primary');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
  }), { id: recordId, row: original });

  await page.reload();
  await page.getByRole('button', { name: 'Read test record' }).click();
  await expect(page.getByTestId('vault-test-result')).toHaveText('Vault read failed');
});
