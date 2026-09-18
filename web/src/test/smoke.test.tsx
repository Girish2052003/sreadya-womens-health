import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import HomePage from '../app/page';

describe('Sreadya Web root page', () => {
  it('renders the Sreadya product identity and Open Sreadya action', () => {
    const markup = renderToStaticMarkup(createElement(HomePage));

    expect(markup).toContain('Sreadya');
    expect(markup).toContain('Open Sreadya');
  });
});
