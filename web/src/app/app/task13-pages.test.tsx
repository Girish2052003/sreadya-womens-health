import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import AssistantPage from './assistant/page';
import InsightsPage from './insights/page';
import LifeStagePage from './life-stage/page';
import PrivacyPage from './privacy/page';
import ReportsPage from './reports/page';
import SharingPage from './sharing/page';

const CASES = [
  ['Life Stage', LifeStagePage],
  ['Insights', InsightsPage],
  ['Reports', ReportsPage],
  ['Assistant', AssistantPage],
  ['Sharing', SharingPage],
  ['Privacy', PrivacyPage],
] as const;

describe('Task 13 dedicated workspace pages', () => {
  it.each(CASES)('gives %s a dedicated private workspace shell', (title, Page) => {
    const html = renderToStaticMarkup(<Page />);

    expect(html).toContain(`<h1>${title}</h1>`);
    expect(html).toContain('Private workspace');
    expect(html).toContain('Local-first');
  });
});
