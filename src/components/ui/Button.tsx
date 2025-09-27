/**
 * Button component with various styles and states
 * Follows World App design guidelines with primary color RGB(25, 137, 251)
 */

import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { BaseComponentProps } from '@/types';

interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  className,
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  onClick,
  type = 'button',
  ...props
}, ref) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-2xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in srgb,var(--color-accent-blue) 55%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-base)] disabled:opacity-75 disabled:cursor-not-allowed disabled:pointer-events-none';

  const variantClasses = {
    primary:
      'bg-[var(--color-accent-blue)] text-black shadow-[0_12px_30px_rgba(75,122,242,0.35)] hover:bg-[color-mix(in srgb,var(--color-accent-blue) 94%,white 6%)] hover:shadow-[0_18px_40px_rgba(75,122,242,0.45)] active:bg-[color-mix(in srgb,var(--color-accent-blue) 82%,black 18%)] active:shadow-[0_8px_20px_rgba(75,122,242,0.25)] disabled:bg-[color-mix(in srgb,var(--color-accent-blue) 28%,var(--color-bg-surface) 72%)] disabled:text-[color-mix(in srgb,black 35%,var(--color-text-secondary) 65%)] disabled:shadow-none',
    secondary:
      'border border-[color-mix(in srgb,var(--color-divider-low) 60%,transparent)] bg-[color-mix(in srgb,var(--color-bg-surface) 92%,transparent)] text-[var(--color-text-primary)] hover:border-[color-mix(in srgb,var(--color-accent-blue) 45%,transparent)] hover:bg-[color-mix(in srgb,var(--color-bg-surface) 82%,var(--color-accent-blue) 12%)] active:bg-[color-mix(in srgb,var(--color-bg-surface) 76%,var(--color-accent-blue) 16%)] disabled:border-[color-mix(in srgb,var(--color-divider-low) 50%,transparent)] disabled:bg-[color-mix(in srgb,var(--color-bg-surface) 94%,transparent)] disabled:text-[color-mix(in srgb,var(--color-text-secondary) 75%,transparent)]',
    ghost:
      'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[color-mix(in srgb,var(--color-bg-surface) 78%,transparent)]',
    destructive:
      'bg-[var(--color-error)] text-[var(--color-text-primary)] hover:bg-[color-mix(in srgb,var(--color-error) 92%,black 8%)] focus-visible:ring-[color-mix(in srgb,var(--color-error) 55%,transparent)] active:bg-[color-mix(in srgb,var(--color-error) 80%,black 20%)] disabled:bg-[color-mix(in srgb,var(--color-error) 30%,var(--color-bg-surface) 70%)]',
    outline:
      'border border-[color-mix(in srgb,var(--color-divider-low) 55%,transparent)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[color-mix(in srgb,var(--color-accent-blue) 45%,transparent)] hover:bg-[color-mix(in srgb,var(--color-bg-surface) 80%,var(--color-accent-blue) 10%)] disabled:text-[color-mix(in srgb,var(--color-text-secondary) 75%,transparent)]',
  };

  const sizeClasses = {
    sm: 'h-8 px-3 text-sm gap-2',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-12 px-6 text-base gap-3',
    xl: 'h-14 px-8 text-lg gap-3',
  };

  const buttonClasses = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && 'w-full',
    className
  );

  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
