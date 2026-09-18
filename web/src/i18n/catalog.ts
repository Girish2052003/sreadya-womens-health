import source from '../../../shared/i18n/source/en.json';

export type MessageKey = keyof typeof source;
export type MessageParams = Readonly<Record<string, string | number>>;

export const sourceMessages: Readonly<Record<string, string>> = source;

export function sourceMessage(key: string, fallback?: string): string {
  return sourceMessages[key] ?? fallback ?? key;
}

export function interpolateMessage(template: string, params: MessageParams = {}): string {
  return template.replace(/\{([A-Za-z0-9_.-]+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}
