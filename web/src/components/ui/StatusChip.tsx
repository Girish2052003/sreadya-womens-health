import type { ReactNode } from 'react';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

type Props = {
  children: ReactNode;
  tone?: StatusTone;
};

export function StatusChip({ children, tone = 'neutral' }: Props) {
  return (
    <span className={`sreva-status sreva-status--${tone}`} data-tone={tone}>
      <span className="sreva-status__dot" aria-hidden="true" />
      <span>{children}</span>
    </span>
  );
}
