import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DEFAULT_ACCESSIBILITY_PREFERENCES } from './preferences';
import { AccessibilityPreferencesPanel } from './AccessibilityPreferencesPanel';

describe('AccessibilityPreferencesPanel', () => {
  it('exposes local text-size, motion and contrast controls without health-data language', () => {
    const html = renderToStaticMarkup(
      <AccessibilityPreferencesPanel
        preferences={DEFAULT_ACCESSIBILITY_PREFERENCES}
        saving={false}
        onChange={() => undefined}
        onSave={() => undefined}
      />,
    );

    for (const text of [
      'Accessibility',
      'Adjust reading and motion preferences on this device.',
      'Text size',
      'Standard',
      'Large',
      'Motion',
      'Follow system',
      'Reduce motion',
      'Contrast',
      'High contrast',
      'Save accessibility preferences',
    ]) {
      expect(html).toContain(text);
    }

    expect(html).toContain('name="text-scale"');
    expect(html).toContain('name="motion"');
    expect(html).toContain('name="contrast"');
    expect(html).not.toContain('health data');
  });
});
