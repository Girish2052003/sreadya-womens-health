import { describe, expect, it } from 'vitest';

import { generateStaticParams } from './page';

const DEDICATED = [
  'predictions',
  'reminders',
  'life-stage',
  'insights',
  'reports',
  'assistant',
  'sharing',
  'privacy',
  'vault',
] as const;

describe('workspace static route ownership', () => {
  it('leaves completed capability workspaces to their dedicated routes', () => {
    const sections = generateStaticParams().map(({ section }) => section);

    for (const section of DEDICATED) expect(sections).not.toContain(section);
    expect(sections).toContain('home');
  });
});
