import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AccessibleChartFrame } from './AccessibleChartFrame';

describe('AccessibleChartFrame', () => {
  it('keeps a meaningful textual summary attached to any future graphical visualization', () => {
    render(
      <AccessibleChartFrame
        title="Cycle length history"
        summary="Four recorded cycles ranged from 27 to 30 days."
      >
        <svg aria-hidden="true" data-testid="visualization-fixture" />
      </AccessibleChartFrame>,
    );

    const figure = screen.getByRole('figure', { name: 'Cycle length history' });
    const summary = screen.getByText('Four recorded cycles ranged from 27 to 30 days.');
    const visualization = screen.getByTestId('visualization-fixture');

    expect(figure).toBeTruthy();
    expect(summary.textContent).toBe('Four recorded cycles ranged from 27 to 30 days.');
    expect(visualization.getAttribute('aria-hidden')).toBe('true');
  });
});
