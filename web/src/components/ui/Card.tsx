import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  title?: string;
  eyebrow?: string;
  className?: string;
};

export function Card({ children, title, eyebrow, className = '' }: Props) {
  return (
    <section className={`sreadya-card ${className}`.trim()}>
      {eyebrow ? <p className="sreadya-card__eyebrow">{eyebrow}</p> : null}
      {title ? <h2 className="sreadya-card__title">{title}</h2> : null}
      <div className="sreadya-card__body">{children}</div>
    </section>
  );
}
