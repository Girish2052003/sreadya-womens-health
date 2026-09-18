export const colorRoles = {
  'sreadya-crimson': 'var(--sreadya-crimson)',
  'sreadya-rose': 'var(--sreadya-rose)',
  'sreadya-pink': 'var(--sreadya-pink)',
  'sreadya-blush': 'var(--sreadya-blush)',
  'sreadya-pearl': 'var(--sreadya-pearl)',
  'sreadya-ink': 'var(--sreadya-ink)',
  'sreadya-muted': 'var(--sreadya-muted)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  info: 'var(--info)',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 20, pill: 999 } as const;
export const motion = { instantMs: 0, fastMs: 120, standardMs: 200, slowMs: 320 } as const;

export type SreadyaColorRole = keyof typeof colorRoles;
