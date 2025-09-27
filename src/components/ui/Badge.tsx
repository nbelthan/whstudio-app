/**
 * Badge component for displaying status indicators, tags, and labels
 * Provides consistent styling for various badge types
 */

import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { BaseComponentProps } from '@/types';

interface BadgeProps extends BaseComponentProps {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(({
  className,
  children,
  variant = 'default',
  size = 'md',
  rounded = false,
  removable = false,
  onRemove,
  leftIcon,
  rightIcon,
  ...props
}, ref) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors duration-200 rounded-full';

  const variantClasses = {
    default: 'bg-[color-mix(in srgb,var(--color-bg-surface) 80%,white 5%)] text-[var(--color-text-primary)] border border-[color-mix(in srgb,var(--color-divider-low) 80%,transparent)]',
    primary: 'bg-[color-mix(in srgb,var(--color-accent-blue) 20%,transparent)] text-[var(--color-accent-blue)] border border-[color-mix(in srgb,var(--color-accent-blue) 35%,transparent)]',
    success: 'bg-[color-mix(in srgb,var(--color-success) 18%,transparent)] text-[var(--color-success)] border border-[color-mix(in srgb,var(--color-success) 32%,transparent)]',
    warning: 'bg-[color-mix(in srgb,var(--color-warning) 18%,transparent)] text-[var(--color-warning)] border border-[color-mix(in srgb,var(--color-warning) 32%,transparent)]',
    error: 'bg-[color-mix(in srgb,var(--color-error) 18%,transparent)] text-[var(--color-error)] border border-[color-mix(in srgb,var(--color-error) 32%,transparent)]',
    info: 'bg-[color-mix(in srgb,var(--color-accent-teal) 18%,transparent)] text-[var(--color-accent-teal)] border border-[color-mix(in srgb,var(--color-accent-teal) 32%,transparent)]',
    ghost: 'bg-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
  };

  const sizeClasses = {
    sm: 'h-6 px-2.5 text-xs gap-1.5',
    md: 'h-7 px-3 text-xs gap-2',
    lg: 'h-8 px-3.5 text-sm gap-2',
  };

  const badgeClasses = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    rounded ? 'rounded-full' : 'rounded-full',
    className
  );

  return (
    <span ref={ref} className={badgeClasses} {...props}>
      {leftIcon && <span className="shrink-0">{leftIcon}</span>}
      <span className="truncate">{children}</span>
      {rightIcon && !removable && <span className="shrink-0">{rightIcon}</span>}
      {removable && onRemove && (
        <button
          type="button"
          className="ml-1 shrink-0 w-3 h-3 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors duration-200"
          onClick={onRemove}
        >
          <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 8">
            <path d="M4 3.293l2.646-2.647a.5.5 0 01.708.708L4.707 4l2.647 2.646a.5.5 0 01-.708.708L4 4.707 1.354 7.354a.5.5 0 01-.708-.708L3.293 4 .646 1.354a.5.5 0 01.708-.708L4 3.293z" />
          </svg>
        </button>
      )}
    </span>
  );
});

Badge.displayName = 'Badge';

export default Badge;
