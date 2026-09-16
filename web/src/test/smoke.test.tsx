import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import HomePage from '../app/page';

describe('Sreva Web root page', () => {
  it('renders the Sreva product identity and Open Sreva action', () => {
    const markup = renderToStaticMarkup(createElement(HomePage));

    expect(markup).toContain('Sreva');
    expect(markup).toContain('Open Sreva');
  });
});
