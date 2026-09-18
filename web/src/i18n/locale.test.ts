import { describe, expect, it } from 'vitest';

import {
  formatLocaleDate,
  formatLocaleTime,
  formatLocaleUnit,
  localeDirection,
  messageLocale,
  normalizeLocaleTag,
} from './locale';

describe('locale foundation', () => {
  it('preserves requested BCP-47 locale identity and script direction', () => {
    expect(messageLocale('en-US')).toBe('en-US');
    expect(messageLocale('fi-FI')).toBe('fi-FI');
    expect(normalizeLocaleTag('ar-eg')).toBe('ar-EG');
    expect(localeDirection('en-US')).toBe('ltr');
    expect(localeDirection('fi-FI')).toBe('ltr');
    expect(localeDirection('ar-EG')).toBe('rtl');
    expect(localeDirection('he-IL')).toBe('rtl');
  });

  it('formats dates using the requested BCP-47 locale instead of a fixed US layout', () => {
    const value = '2026-09-16T18:05:00.000Z';
    expect(formatLocaleDate(value, 'en-US', 'UTC')).toBe('Sep 16, 2026');
    expect(formatLocaleDate(value, 'en-GB', 'UTC')).toBe('16 Sept 2026');
  });

  it('supports explicit 12-hour and 24-hour time presentation', () => {
    const value = '2026-09-16T18:05:00.000Z';
    expect(formatLocaleTime(value, 'en-US', '12h', 'UTC')).toBe('6:05 PM');
    expect(formatLocaleTime(value, 'en-US', '24h', 'UTC')).toBe('18:05');
  });

  it('formats measurement units through Intl rather than concatenating English-only suffixes', () => {
    const formatted = formatLocaleUnit(37, 'celsius', 'en-US');
    expect(formatted).toContain('37');
    expect(formatted).toContain('°C');
  });
});
