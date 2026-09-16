import type { ReactNode } from 'react';

type Props = {
  title: string;
  summary: string;
  children: ReactNode;
};

export function AccessibleChartFrame({ title, summary, children }: Props) {
  return (
    <figure className="accessible-chart-frame" aria-label={title}>
      {children}
      <figcaption className="accessible-chart-frame__caption">
        <strong>{title}</strong>
        <p>{summary}</p>
      </figcaption>
    </figure>
  );
}
