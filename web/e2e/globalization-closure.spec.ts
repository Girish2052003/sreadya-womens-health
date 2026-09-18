import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

type PublicLocale = {
  tag: string;
  englishName: string;
  coverage: 'source' | 'complete';
};

type ManifestArtifact = {
  locale: string;
  path: string;
  coverage: string;
  messageCount: number;
  sourceMessageCount: number;
  provider: string;
};

type I18nManifest = {
  version: number;
  sourceLocale: string;
  publicLocales: PublicLocale[];
  artifacts: Record<string, ManifestArtifact>;
};

async function manifest(request: APIRequestContext): Promise<I18nManifest> {
  const response = await request.get('/i18n/manifest.json');
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<I18nManifest>;
}

async function bundle(
  request: APIRequestContext,
  data: I18nManifest,
  tag: string,
): Promise<Record<string, string>> {
  const artifact = data.artifacts[tag.toLowerCase()];
  expect(artifact, `missing artifact for ${tag}`).toBeTruthy();
  const response = await request.get(`/${artifact.path}`);
  expect(response.ok(), `failed to load ${artifact.path}`).toBeTruthy();
  return response.json() as Promise<Record<string, string>>;
}

function providerClosurePublished(data: I18nManifest): boolean {
  return data.publicLocales.length >= 194;
}

async function chooseLanguage(page: Page, englishName: string, tag: string): Promise<void> {
  await page.goto('/');
  await page.getByTestId('language-chooser-trigger').click();
  await page.getByTestId('language-chooser-search').fill(englishName);
  const option = page.locator(`[data-language-tag="${tag}"]`);
  await expect(option).toBeVisible();
  await option.click();
  await expect(page.locator('html')).toHaveAttribute('lang', tag);
}

test('published locales are complete and pre-sync publication fails closed until the 194+ provider birth run', async ({ request, browserName }) => {
  test.skip(browserName !== 'chromium', 'One exhaustive artifact proof is sufficient; representative rendering is cross-browser.');

  const data = await manifest(request);
  expect(data.version).toBeGreaterThanOrEqual(2);
  expect(data.sourceLocale).toBe('en');

  const englishArtifact = data.artifacts.en;
  expect(englishArtifact).toBeTruthy();
  expect(englishArtifact.coverage).toBe('source');
  const english = await bundle(request, data, 'en');
  const sourceKeys = Object.keys(english).sort();
  expect(sourceKeys.length).toBeGreaterThanOrEqual(1249);

  if (!providerClosurePublished(data)) {
    // Before the protected Google birth run, SREADYA must publish no partial
    // provider locales. English remains the only selectable language and the
    // pseudo locales remain test-only artifacts.
    expect(data.publicLocales).toHaveLength(1);
    expect(data.publicLocales[0]).toMatchObject({ tag: 'en', coverage: 'source' });
    expect(Object.keys(data.artifacts).sort()).toEqual(['ar-xb', 'en', 'en-xa']);
    expect(data.artifacts['en-xa']?.coverage).toBe('pseudo');
    expect(data.artifacts['ar-xb']?.coverage).toBe('pseudo');
    return;
  }

  expect(data.publicLocales.length).toBeGreaterThanOrEqual(194);
  const seen = new Set<string>();
  for (const locale of data.publicLocales) {
    const key = locale.tag.toLowerCase();
    expect(seen.has(key), `duplicate public locale ${locale.tag}`).toBe(false);
    seen.add(key);

    expect(['source', 'complete']).toContain(locale.coverage);
    const artifact = data.artifacts[key];
    expect(artifact, `missing manifest artifact for ${locale.tag}`).toBeTruthy();
    expect(artifact.messageCount).toBe(sourceKeys.length);
    expect(artifact.sourceMessageCount).toBe(sourceKeys.length);
    expect(['source', 'complete']).toContain(artifact.coverage);
    if (key !== 'en') {
      expect(artifact.provider).toBe('google-cloud-translation');
    }

    const translated = await bundle(request, data, locale.tag);
    expect(Object.keys(translated).sort(), `key parity failed for ${locale.tag}`).toEqual(sourceKeys);
    for (const messageKey of sourceKeys) {
      expect(typeof translated[messageKey], `${locale.tag}:${messageKey}`).toBe('string');
      expect(translated[messageKey].trim().length, `${locale.tag}:${messageKey}`).toBeGreaterThan(0);
    }
  }
});

test('language chooser exactly reflects complete published locales with no raw fallback rows', async ({ page, request }) => {
  const data = await manifest(request);

  await page.goto('/');
  await page.getByTestId('language-chooser-trigger').click();

  const list = page.locator('.language-chooser__list');
  await expect(list).toBeVisible();
  await expect(page.locator('.language-chooser__list')).toHaveCount(1);
  await expect(page.locator('.language-chooser__option').first()).toBeVisible();

  const optionCount = await page.locator('.language-chooser__option').count();
  expect(optionCount).toBe(data.publicLocales.length);

  if (providerClosurePublished(data)) {
    expect(optionCount).toBeGreaterThanOrEqual(194);
  } else {
    expect(optionCount).toBe(1);
    await expect(page.locator('.language-chooser__option[data-language-tag="en"]')).toHaveCount(1);
    await expect(page.locator('[data-language-tag="ar"]')).toHaveCount(0);
    await expect(page.locator('[data-language-tag="en-XA"]')).toHaveCount(0);
    await expect(page.locator('[data-language-tag="ar-XB"]')).toHaveCount(0);
  }

  await expect(page.getByText('English fallback', { exact: true })).toHaveCount(0);
  await expect(page.locator('[data-language-tag="aa"]')).toHaveCount(0);
  await expect(page.locator('[data-language-tag="aaa"]')).toHaveCount(0);
});

for (const target of [
  { tag: 'ar', englishName: 'Arabic', direction: 'rtl' },
  { tag: 'de', englishName: 'German', direction: 'ltr' },
  { tag: 'fi', englishName: 'Finnish', direction: 'ltr' },
  { tag: 'hi', englishName: 'Hindi', direction: 'ltr' },
  { tag: 'ta', englishName: 'Tamil', direction: 'ltr' },
  { tag: 'zh-CN', englishName: 'Chinese (Simplified)', direction: 'ltr' },
] as const) {
  test(`${target.englishName} renders coherently across public and private routes without layout mirroring`, async ({ page, request }) => {
    const data = await manifest(request);
    if (!providerClosurePublished(data)) {
      // This is not a waiver: pre-sync publication is required to exclude the
      // target completely. Once 194+ provider closure exists, the assertions
      // below become mandatory automatically.
      const key = target.tag.toLowerCase();
      expect(data.publicLocales.some((locale) => locale.tag.toLowerCase() === key)).toBe(false);
      expect(data.artifacts[key]).toBeUndefined();
      return;
    }

    const published = data.publicLocales.some(
      (locale) => locale.tag.toLowerCase() === target.tag.toLowerCase(),
    );
    expect(published, `${target.tag} must be public after provider closure`).toBe(true);
    const translated = await bundle(request, data, target.tag);

    await chooseLanguage(page, target.englishName, target.tag);
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('html')).toHaveAttribute('data-sreadya-text-direction', target.direction);

    expect(translated['home.headline']).toBeTruthy();
    await expect(page.getByText(translated['home.headline'], { exact: true })).toBeVisible();
    await expect(page.getByText(translated['nav.public.features'], { exact: true })).toBeVisible();

    await page.goto('/help/');
    await expect(page.locator('html')).toHaveAttribute('lang', target.tag);
    await expect(page.getByText(translated['publicPage.help.title'], { exact: true })).toBeVisible();

    await page.goto('/app/home/');
    await expect(page.locator('html')).toHaveAttribute('lang', target.tag);
    await expect(page.getByText(translated['homeCore.title.today'], { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', target.tag);
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('html')).toHaveAttribute('data-sreadya-text-direction', target.direction);
  });
}
