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

    expect(screen.getByRole('figure', { name: 'Cycle length history' })).toBeInTheDocument();
    expect(screen.getByText('Four recorded cycles ranged from 27 to 30 days.')).toBeInTheDocument();
    expect(screen.getByTestId('visualization-fixture')).toHaveAttribute('aria-hidden', 'true');
  });
});
