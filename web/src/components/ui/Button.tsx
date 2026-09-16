import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

export function Button({ children, className = '', variant = 'primary', type = 'button', ...props }: Props) {
  return (
    <button
      type={type}
      className={`sreva-button sreva-button--${variant} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
