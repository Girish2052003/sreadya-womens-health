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

function dateKey(date: Date): string {
  return [
    date.getUTCFullYear().toString().padStart(4, '0'),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function displayCycleCardDate(date: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
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

  const expectedHeading = displayCycleCardDate(start);
  await page.waitForTimeout(250);
  const headings = await cards.getByRole('heading').allTextContents();
  const errors = await page.locator('.core-error[role="alert"]').allTextContents();
  if (!headings.includes(expectedHeading)) {
    throw new Error(`Cycle edit did not render ${expectedHeading}. Headings: ${headings.join(' | ')}. Errors: ${errors.join(' | ')}`);
  }
  expect(errors).toEqual([]);
}

async function readReminderPreferenceRecord(page: Page) {
  return page.evaluate(async () => new Promise<PersistedVaultRecord | undefined>((resolve, reject) => {
    const request = indexedDB.open('sreva-vault-v1');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('records', 'readonly');
      const getRequest = transaction.objectStore('records').get('preferences:reminders:v1');
      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => resolve(getRequest.result as PersistedVaultRecord | undefined);
    };
  }));
}

test('Reminder Health is account-free, truthful, local and opt-in by default', async ({ page }) => {
  const remoteRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') remoteRequests.push(request.url());
  });

  await page.goto('/app/reminders/');

  await expect(page.getByRole('heading', { name: 'Reminders' })).toBeVisible();
  await expect(page.getByText('Encrypted local vault ready')).toBeVisible();
  await expect(page.getByText(/Account-free · local reminder policy · local authoritative data/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Reminder settings' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Reminder Health' })).toBeVisible();
  await expect(page.getByLabel('7 days before')).not.toBeChecked();
  await expect(page.getByLabel('3 days before')).not.toBeChecked();
  await expect(page.getByLabel('1 day before')).not.toBeChecked();
  await expect(page.getByLabel('Expected day')).not.toBeChecked();
  await expect(page.getByRole('radio', { name: /Maximum Privacy/ })).toBeChecked();
  await expect(page.getByText(/Closed-app delivery is not guaranteed/)).toBeVisible();
  await expect(page.getByText('Sign in required')).toHaveCount(0);
  expect(remoteRequests).toEqual([]);
});

test('3-day reminder configuration persists encrypted and derives its next intent from local Prediction v1', async ({ page }) => {
  const remoteRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') remoteRequests.push(request.url());
  });

  await page.goto('/app/cycle/');
  await expect(page.getByText('Encrypted local vault ready')).toBeVisible();

  const starts = [-85, -57, -29, -1].map(offsetDate);
  for (const start of starts) {
    const endDate = new Date(`${start}T12:00:00Z`);
    endDate.setUTCDate(endDate.getUTCDate() + 4);
    await addHistoricalPeriod(page, start, dateKey(endDate));
  }

  await page.goto('/app/reminders/');
  await expect(page.getByText('Encrypted local vault ready')).toBeVisible();

  await page.getByLabel('3 days before').check();
  await page.getByLabel('Late reminder days').fill('2');
  await page.getByRole('radio', { name: /Balanced/ }).check();
  await page.getByRole('button', { name: 'Save reminder settings' }).click();
  await expect(page.getByText('Saved locally · encrypted')).toBeVisible();

  const predicted = new Date(`${starts.at(-1)!}T12:00:00Z`);
  predicted.setUTCDate(predicted.getUTCDate() + 28);
  const threeDaysBefore = new Date(predicted);
  threeDaysBefore.setUTCDate(threeDaysBefore.getUTCDate() - 3);
  const expectedNextDate = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(threeDaysBefore);

  await expect(page.getByRole('heading', { name: expectedNextDate })).toBeVisible();
  await expect(page.getByText(/Period Three Days · 08:00/)).toBeVisible();
  await expect(page.getByText(/Closed-app delivery is not guaranteed/)).toBeVisible();

  const stored = await readReminderPreferenceRecord(page);
  expect(stored).toBeTruthy();
  expect(stored!.sealed.algorithm).toBe('AES-GCM');
  const serialized = JSON.stringify(stored);
  expect(serialized).not.toContain('enabledOffsetsDays');
  expect(serialized).not.toContain('lateDays');
  expect(serialized).not.toContain('balanced');

  await page.reload();
  await expect(page.getByText('Encrypted local vault ready')).toBeVisible();
  await expect(page.getByLabel('3 days before')).toBeChecked();
  await expect(page.getByLabel('Late reminder days')).toHaveValue('2');
  await expect(page.getByRole('radio', { name: /Balanced/ })).toBeChecked();
  await expect(page.getByRole('heading', { name: expectedNextDate })).toBeVisible();
  expect(remoteRequests).toEqual([]);
});
