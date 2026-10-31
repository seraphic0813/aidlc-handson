import type { ButtonHTMLAttributes } from 'react';
export function Button({
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      data-testid="button"
      className={`button ${className}`}
      {...props}
    />
  );
}
