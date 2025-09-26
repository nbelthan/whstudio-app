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
  const baseClasses = 'rounded-xl transition-all duration-200';

  const variantClasses = {
    default: 'bg-white/5 border border-white/10',
    elevated: 'bg-white/10 shadow-lg shadow-black/20 border border-white/5',
    outlined: 'border border-white/20 bg-transparent',
    glass: 'bg-white/5 backdrop-blur-md border border-white/10',
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
    hover && 'hover:bg-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-black/10',
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
        <h3 className="text-lg font-semibold text-white truncate">
          {title}
        </h3>
      )}
      {subtitle && (
        <p className="text-sm text-white/60 mt-1">
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
    className={cn('text-white/80', className)}
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
        'flex items-center gap-3 mt-4 pt-4 border-t border-white/10',
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