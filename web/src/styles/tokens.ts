export const colorRoles = {
  'sreva-crimson': 'var(--sreva-crimson)',
  'sreva-rose': 'var(--sreva-rose)',
  'sreva-pink': 'var(--sreva-pink)',
  'sreva-blush': 'var(--sreva-blush)',
  'sreva-pearl': 'var(--sreva-pearl)',
  'sreva-ink': 'var(--sreva-ink)',
  'sreva-muted': 'var(--sreva-muted)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  info: 'var(--info)',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 20, pill: 999 } as const;
export const motion = { instantMs: 0, fastMs: 120, standardMs: 200, slowMs: 320 } as const;

export type SrevaColorRole = keyof typeof colorRoles;
