export type TextScalePreference = 'normal' | 'large';
export type MotionPreference = 'system' | 'reduced';
export type ContrastPreference = 'system' | 'high';

export type AccessibilityPreferences = {
  textScale: TextScalePreference;
  motion: MotionPreference;
  contrast: ContrastPreference;
};

type AccessibilityStorage = Pick<Storage, 'getItem' | 'setItem'>;
type AccessibilityAttributeTarget = Pick<Element, 'setAttribute'>;

type StoredAccessibilityPreferences = AccessibilityPreferences & {
  version: 1;
};

export const ACCESSIBILITY_STORAGE_KEY = 'sreva:accessibility:v1';

export const DEFAULT_ACCESSIBILITY_PREFERENCES: AccessibilityPreferences = Object.freeze({
  textScale: 'normal',
  motion: 'system',
  contrast: 'system',
});

function isAccessibilityPreferences(value: unknown): value is StoredAccessibilityPreferences {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<StoredAccessibilityPreferences>;
  return (
    candidate.version === 1 &&
    (candidate.textScale === 'normal' || candidate.textScale === 'large') &&
    (candidate.motion === 'system' || candidate.motion === 'reduced') &&
    (candidate.contrast === 'system' || candidate.contrast === 'high')
  );
}

export function parseAccessibilityPreferences(raw: string | null): AccessibilityPreferences {
  if (!raw) return { ...DEFAULT_ACCESSIBILITY_PREFERENCES };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isAccessibilityPreferences(parsed)) return { ...DEFAULT_ACCESSIBILITY_PREFERENCES };
    return {
      textScale: parsed.textScale,
      motion: parsed.motion,
      contrast: parsed.contrast,
    };
  } catch {
    return { ...DEFAULT_ACCESSIBILITY_PREFERENCES };
  }
}

export function loadAccessibilityPreferences(storage: AccessibilityStorage): AccessibilityPreferences {
  return parseAccessibilityPreferences(storage.getItem(ACCESSIBILITY_STORAGE_KEY));
}

export function saveAccessibilityPreferences(
  preferences: AccessibilityPreferences,
  storage: AccessibilityStorage,
): void {
  const record: StoredAccessibilityPreferences = { version: 1, ...preferences };
  storage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(record));
}

export function accessibilityDataAttributes(
  preferences: AccessibilityPreferences,
): Record<`data-sreva-${string}`, string> {
  return {
    'data-sreva-text-scale': preferences.textScale,
    'data-sreva-motion': preferences.motion,
    'data-sreva-contrast': preferences.contrast,
  };
}

export function applyAccessibilityPreferences(
  target: AccessibilityAttributeTarget,
  preferences: AccessibilityPreferences,
): void {
  for (const [name, value] of Object.entries(accessibilityDataAttributes(preferences))) {
    target.setAttribute(name, value);
  }
}
