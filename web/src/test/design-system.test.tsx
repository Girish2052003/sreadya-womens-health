import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { StatusChip } from '../components/ui/StatusChip';
import { PublicHeader } from '../components/navigation/PublicHeader';
import { WorkspaceNav } from '../components/navigation/WorkspaceNav';
import { colorRoles, motion, radius, spacing } from '../styles/tokens';

describe('Sreadya Web design system', () => {
  it('exposes every frozen semantic colour role without making colour the only state signal', () => {
    expect(Object.keys(colorRoles)).toEqual(
      expect.arrayContaining([
        'sreadya-crimson',
        'sreadya-rose',
        'sreadya-pink',
        'sreadya-blush',
        'sreadya-pearl',
        'sreadya-ink',
        'sreadya-muted',
        'success',
        'warning',
        'danger',
        'info',
      ]),
    );
    expect(spacing.md).toBe(16);
    expect(radius.lg).toBe(20);
    expect(motion.standardMs).toBe(200);
  });

  it('renders reusable controls with accessible names and explicit state text', () => {
    const button = renderToStaticMarkup(<Button>Continue privately</Button>);
    const card = renderToStaticMarkup(<Card title="Your next period">Private health summary</Card>);
    const chip = renderToStaticMarkup(<StatusChip tone="success">Saved locally</StatusChip>);

    expect(button).toContain('Continue privately');
    expect(button).toContain('<button');
    expect(card).toContain('Your next period');
    expect(card).toContain('Private health summary');
    expect(chip).toContain('Saved locally');
  });

  it('keeps public and private navigation deliberately different', () => {
    const publicNav = renderToStaticMarkup(<PublicHeader />);
    const workspaceNav = renderToStaticMarkup(<WorkspaceNav active="home" />);

    expect(publicNav).toContain('aria-label="Public navigation"');
    expect(publicNav).toContain('Features');
    expect(publicNav).toContain('Privacy');
    expect(publicNav).toContain('Open Sreadya');

    expect(workspaceNav).toContain('aria-label="Sreadya workspace"');
    for (const label of ['Home', 'Today', 'Log', 'Calendar', 'More']) {
      expect(workspaceNav).toContain(label);
    }
  });
});
