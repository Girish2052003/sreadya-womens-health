import { describe, expect, it } from 'vitest';

import { generateStaticParams } from './page';

describe('workspace static route ownership', () => {
  it('leaves predictions to its dedicated Task 11 route', () => {
    const sections = generateStaticParams().map(({ section }) => section);

    expect(sections).not.toContain('predictions');
    expect(sections).toContain('home');
    expect(sections).toContain('vault');
  });
});
