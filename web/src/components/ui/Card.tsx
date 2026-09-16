import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  title?: string;
  eyebrow?: string;
  className?: string;
};

export function Card({ children, title, eyebrow, className = '' }: Props) {
  return (
    <section className={`sreva-card ${className}`.trim()}>
      {eyebrow ? <p className="sreva-card__eyebrow">{eyebrow}</p> : null}
      {title ? <h2 className="sreva-card__title">{title}</h2> : null}
      <div className="sreva-card__body">{children}</div>
    </section>
  );
}
