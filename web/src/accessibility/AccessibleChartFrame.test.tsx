import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AccessibleChartFrame } from './AccessibleChartFrame';

describe('AccessibleChartFrame', () => {
  it('keeps a meaningful textual summary attached to any future graphical visualization', () => {
    const html = renderToStaticMarkup(
      <AccessibleChartFrame
        title="Cycle length history"
        summary="Four recorded cycles ranged from 27 to 30 days."
      >
        <svg aria-hidden="true" data-testid="visualization-fixture" />
      </AccessibleChartFrame>,
    );

    expect(html).toContain('<figure');
    expect(html).toContain('aria-label="Cycle length history"');
    expect(html).toContain('<figcaption');
    expect(html).toContain('Four recorded cycles ranged from 27 to 30 days.');
    expect(html).toContain('aria-hidden="true"');
  });
});
