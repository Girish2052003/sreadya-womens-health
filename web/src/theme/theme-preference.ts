export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const GENERAL_SETTINGS_KEY = 'sreva:general-settings:v1';

type ThemeStorage = Pick<Storage, 'getItem' | 'setItem'>;
type ThemeTarget = Pick<HTMLElement, 'setAttribute'>;

function readRecord(storage: ThemeStorage): Record<string, unknown> {
  try {
    const raw = storage.getItem(GENERAL_SETTINGS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

export function normalizeThemePreference(value: unknown): ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

export function readThemePreference(storage: ThemeStorage): ThemePreference {
  return normalizeThemePreference(readRecord(storage).theme);
}

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): ResolvedTheme {
  return preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference;
}

export function applyThemePreference(
  target: ThemeTarget,
  preference: ThemePreference,
  prefersDark: boolean,
): ResolvedTheme {
  const resolved = resolveTheme(preference, prefersDark);
  target.setAttribute('data-sreva-theme', resolved);
  target.setAttribute('data-sreva-theme-preference', preference);
  return resolved;
}

export function saveThemePreference(storage: ThemeStorage, preference: ThemePreference): void {
  const current = readRecord(storage);
  storage.setItem(GENERAL_SETTINGS_KEY, JSON.stringify({ ...current, theme: preference }));
}
