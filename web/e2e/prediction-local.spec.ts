import { expect, test } from '@playwright/test';

test('predictions open account-free from the encrypted local vault without remote health traffic', async ({ page }) => {
  const remoteRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
      remoteRequests.push(request.url());
    }
  });

  await page.goto('/app/predictions/');

  await expect(page.getByRole('heading', { name: 'Predictions' })).toBeVisible();
  await expect(page.getByText('Encrypted local vault ready')).toBeVisible();
  await expect(page.getByText(/Account-free · local calculation · local authoritative data/)).toBeVisible();
  await expect(page.getByText(/More cycle history is needed/)).toBeVisible();
  await expect(page.getByText(/No date is invented/)).toBeVisible();
  await expect(page.getByText('Sign in required')).toHaveCount(0);
  expect(remoteRequests).toEqual([]);
});
