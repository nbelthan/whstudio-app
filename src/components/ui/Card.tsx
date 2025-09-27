/**
 * Card component with various styles and layouts
 * Used for displaying content in containers with consistent styling
 */

import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { BaseComponentProps } from '@/types';

interface CardProps extends BaseComponentProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  clickable?: boolean;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

const Card = forwardRef<HTMLDivElement, CardProps>(({
  className,
  children,
  variant = 'default',
  padding = 'md',
  hover = false,
  clickable = false,
  onClick,
  ...props
}, ref) => {
  const baseClasses = 'rounded-2xl transition-all duration-200 border';

  const variantClasses = {
    default: 'bg-[var(--color-bg-surface)] border-[var(--color-divider-low)]',
    elevated: 'bg-[var(--color-bg-raised)] border-[var(--color-divider-low)]',
    outlined: 'bg-transparent border-[color-mix(in srgb,var(--color-divider-low) 60%,transparent)]',
    glass: 'bg-white/5 backdrop-blur-md border-[var(--color-divider-low)]',
  };

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8',
  };

  const cardClasses = cn(
    baseClasses,
    variantClasses[variant],
    paddingClasses[padding],
    hover && 'hover:border-[color-mix(in srgb,var(--color-accent-blue) 35%,transparent)] hover:bg-[color-mix(in srgb,var(--color-bg-surface) 80%,var(--color-accent-blue) 10%)]',
    clickable && 'cursor-pointer select-none active:scale-[0.98]',
    className
  );

  return (
    <div
      ref={ref}
      className={cardClasses}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

// Card subcomponents
interface CardHeaderProps extends BaseComponentProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(({
  className,
  children,
  title,
  subtitle,
  action,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center justify-between mb-4', className)}
    {...props}
  >
    <div className="flex-1 min-w-0">
      {title && (
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] truncate">
          {title}
        </h3>
      )}
      {subtitle && (
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          {subtitle}
        </p>
      )}
      {children}
    </div>
    {action && (
      <div className="ml-4 shrink-0">
        {action}
      </div>
    )}
  </div>
));

CardHeader.displayName = 'CardHeader';

interface CardContentProps extends BaseComponentProps {}

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(({
  className,
  children,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn('text-[var(--color-text-secondary)]', className)}
    {...props}
  >
    {children}
  </div>
));

CardContent.displayName = 'CardContent';

interface CardFooterProps extends BaseComponentProps {
  justify?: 'start' | 'center' | 'end' | 'between';
}

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(({
  className,
  children,
  justify = 'end',
  ...props
}, ref) => {
  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center gap-3 mt-4 pt-4 border-t border-[var(--color-divider-low)]',
        justifyClasses[justify],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

CardFooter.displayName = 'CardFooter';

// Export compound component
export default Object.assign(Card, {
  Header: CardHeader,
  Content: CardContent,
  Footer: CardFooter,
});
