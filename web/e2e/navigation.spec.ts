import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('public navigation supports deep links, history and an accessible landing surface', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Sreadya' })).toBeVisible();
  await page.getByRole('link', { name: 'Features' }).click();
  await expect(page).toHaveURL(/\/features\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Features' })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('private workspace deep links expose the calm five-item primary navigation', async ({ page }) => {
  await page.goto('/app/home/');
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Sreadya workspace' });
  for (const item of ['Home', 'Today', 'Log', 'Calendar', 'More']) {
    await expect(nav.getByRole('link', { name: item, exact: true })).toBeVisible();
  }

  await page.goto('/app/privacy/');
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy' })).toBeVisible();
});

test('mobile landing header keeps every landing tab including Download visible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const mobileNav = page.locator('.public-header__mobile-nav');
  await expect(mobileNav).toBeVisible();

  for (const item of ['Features', 'How it works', 'Privacy', 'Security', 'Help', 'Download']) {
    await expect(mobileNav.getByRole('link', { name: item, exact: true })).toBeVisible();
  }

  await mobileNav.getByRole('link', { name: 'Download', exact: true }).click();
  await expect(page).toHaveURL(/\/download\/$/);
});

test('secondary public pages use a compact contextual header instead of the landing navigation shell', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });

  const routes = [
    ['/features/', 'Features'],
    ['/how-it-works/', 'How it works'],
    ['/privacy/', 'Privacy'],
    ['/privacy-policy/', 'Privacy Policy'],
    ['/terms/', 'Terms'],
    ['/security/', 'Security'],
    ['/security/report/', 'Security Report'],
    ['/help/', 'Help'],
    ['/download/', 'Download'],
  ] as const;

  for (const [route, heading] of routes) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();

    const header = page.locator('.public-header--section');
    await expect(header).toBeVisible();
    await expect(header.getByRole('link', { name: 'Home', exact: true })).toBeVisible();
    await expect(header.locator('.public-header__nav')).toHaveCount(0);
    await expect(header.locator('.public-header__mobile-nav')).toHaveCount(0);

    const hero = page.locator('.public-page__hero');
    if (route === '/how-it-works/') {
      await expect(hero.getByRole('link', { name: 'Open Sreadya', exact: true })).toBeVisible();
      await expect(hero.getByRole('link', { name: 'How Sreadya works', exact: true })).toHaveCount(0);
    } else {
      await expect(hero.getByRole('link', { name: 'Open Sreadya', exact: true })).toHaveCount(0);
      await expect(hero.getByRole('link', { name: 'How Sreadya works', exact: true })).toHaveCount(0);
    }
  }
});

test('mobile secondary pages do not inherit the six-button landing panel', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const route of ['/how-it-works/', '/privacy-policy/', '/terms/', '/security/report/']) {
    await page.goto(route);
    const header = page.locator('.public-header--section');
    await expect(header).toBeVisible();
    await expect(header.getByRole('link', { name: 'Home', exact: true })).toBeVisible();
    await expect(page.locator('.public-header__mobile-nav')).toHaveCount(0);
  }

  await page.goto('/how-it-works/');
  const howHero = page.locator('.public-page__hero');
  await expect(howHero.getByRole('link', { name: 'Open Sreadya', exact: true })).toBeVisible();
  await expect(howHero.getByRole('link', { name: 'How Sreadya works', exact: true })).toHaveCount(0);
});

test('legal and security footers do not link a page back to itself', async ({ page }) => {
  const cases = [
    ['/privacy-policy/', 'Privacy Policy'],
    ['/terms/', 'Terms'],
    ['/security/report/', 'Security'],
  ] as const;

  for (const [route, label] of cases) {
    await page.goto(route);
    const footer = page.locator('.public-footer');
    await expect(footer.getByText(label, { exact: true })).toBeVisible();
    await expect(footer.getByRole('link', { name: label, exact: true })).toHaveCount(0);
  }
});
