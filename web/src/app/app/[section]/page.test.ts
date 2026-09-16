import { describe, expect, it } from 'vitest';

import { generateStaticParams } from './page';

describe('workspace static route ownership', () => {
  it('leaves predictions and reminders to their dedicated routes', () => {
    const sections = generateStaticParams().map(({ section }) => section);

    expect(sections).not.toContain('predictions');
    expect(sections).not.toContain('reminders');
    expect(sections).toContain('home');
    expect(sections).toContain('vault');
  });
});
