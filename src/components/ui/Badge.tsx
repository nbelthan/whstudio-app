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
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors duration-200';

  const variantClasses = {
    default: 'bg-white/10 text-white/80 border border-white/20',
    primary: 'bg-[rgb(25,137,251)]/20 text-[rgb(25,137,251)] border border-[rgb(25,137,251)]/30',
    success: 'bg-green-500/20 text-green-400 border border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    error: 'bg-red-500/20 text-red-400 border border-red-500/30',
    info: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    ghost: 'bg-transparent text-white/60 hover:text-white/80',
  };

  const sizeClasses = {
    sm: 'h-5 px-2 text-xs gap-1',
    md: 'h-6 px-2.5 text-xs gap-1.5',
    lg: 'h-7 px-3 text-sm gap-2',
  };

  const badgeClasses = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    rounded ? 'rounded-full' : 'rounded-md',
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