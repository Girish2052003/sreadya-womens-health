import type { ReactNode } from 'react';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

type Props = {
  children: ReactNode;
  tone?: StatusTone;
};

export function StatusChip({ children, tone = 'neutral' }: Props) {
  return (
    <span className={`sreadya-status sreadya-status--${tone}`} data-tone={tone}>
      <span className="sreadya-status__dot" aria-hidden="true" />
      <span>{children}</span>
    </span>
  );
}
