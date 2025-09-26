/**
 * Loading components with various styles and sizes
 * Provides consistent loading states throughout the application
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { BaseComponentProps } from '@/types';

interface LoadingSpinnerProps extends BaseComponentProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'white' | 'gray';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  className,
  size = 'md',
  color = 'primary',
}) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };

  const colorClasses = {
    primary: 'border-[rgb(25,137,251)] border-t-transparent',
    white: 'border-white/30 border-t-white',
    gray: 'border-gray-400 border-t-transparent',
  };

  return (
    <div
      className={cn(
        'border-2 rounded-full animate-spin',
        sizeClasses[size],
        colorClasses[color],
        className
      )}
    />
  );
};

interface LoadingDotsProps extends BaseComponentProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'gray';
}

export const LoadingDots: React.FC<LoadingDotsProps> = ({
  className,
  size = 'md',
  color = 'primary',
}) => {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2',
  };

  const colorClasses = {
    primary: 'bg-[rgb(25,137,251)]',
    white: 'bg-white',
    gray: 'bg-gray-400',
  };

  return (
    <div className={cn('flex items-center space-x-1', className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            'rounded-full animate-pulse',
            sizeClasses[size],
            colorClasses[color]
          )}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1s'
          }}
        />
      ))}
    </div>
  );
};

interface LoadingSkeletonProps extends BaseComponentProps {
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  lines?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className,
  width = '100%',
  height = '1rem',
  rounded = false,
  lines = 1,
}) => {
  const skeletonClass = cn(
    'bg-white/10 animate-pulse',
    rounded ? 'rounded-full' : 'rounded',
    className
  );

  if (lines === 1) {
    return (
      <div
        className={skeletonClass}
        style={{ width, height }}
      />
    );
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={skeletonClass}
          style={{
            width: i === lines - 1 ? '70%' : width,
            height,
          }}
        />
      ))}
    </div>
  );
};

interface LoadingCardProps extends BaseComponentProps {
  showAvatar?: boolean;
  showActions?: boolean;
  lines?: number;
}

export const LoadingCard: React.FC<LoadingCardProps> = ({
  className,
  showAvatar = false,
  showActions = false,
  lines = 3,
}) => {
  return (
    <div className={cn('bg-white/5 border border-white/10 rounded-xl p-4', className)}>
      {/* Header */}
      <div className="flex items-center space-x-3 mb-4">
        {showAvatar && (
          <LoadingSkeleton width={40} height={40} rounded />
        )}
        <div className="flex-1">
          <LoadingSkeleton width="60%" height="1.25rem" />
          <LoadingSkeleton width="40%" height="0.875rem" className="mt-2" />
        </div>
      </div>

      {/* Body */}
      <div className="space-y-2 mb-4">
        <LoadingSkeleton lines={lines} />
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex items-center space-x-2 pt-4 border-t border-white/10">
          <LoadingSkeleton width={80} height="2rem" />
          <LoadingSkeleton width={80} height="2rem" />
        </div>
      )}
    </div>
  );
};

interface LoadingOverlayProps extends BaseComponentProps {
  isVisible: boolean;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  className,
  isVisible,
  message = 'Loading...',
  size = 'md',
}) => {
  if (!isVisible) return null;

  return (
    <div className={cn(
      'absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 rounded-xl',
      className
    )}>
      <div className="flex flex-col items-center space-y-3">
        <LoadingSpinner size={size} color="white" />
        {message && (
          <p className="text-white text-sm font-medium">{message}</p>
        )}
      </div>
    </div>
  );
};

interface LoadingPageProps extends BaseComponentProps {
  message?: string;
}

export const LoadingPage: React.FC<LoadingPageProps> = ({
  className,
  message = 'Loading...',
}) => {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center min-h-screen bg-black',
      className
    )}>
      <div className="flex flex-col items-center space-y-4">
        <LoadingSpinner size="xl" color="primary" />
        <p className="text-white/80 text-lg font-medium">{message}</p>
      </div>
    </div>
  );
};

interface LoadingButtonProps extends BaseComponentProps {
  isLoading: boolean;
  loadingText?: string;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  className,
  children,
  isLoading,
  loadingText = 'Loading...',
}) => {
  return (
    <div className={cn('flex items-center space-x-2', className)}>
      {isLoading && <LoadingSpinner size="sm" color="primary" />}
      <span>{isLoading ? loadingText : children}</span>
    </div>
  );
};

// Default loading component
interface LoadingProps extends BaseComponentProps {
  type?: 'spinner' | 'dots' | 'skeleton' | 'card' | 'overlay' | 'page';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'white' | 'gray';
  message?: string;
  isVisible?: boolean;
}

const Loading: React.FC<LoadingProps> = ({
  type = 'spinner',
  size = 'md',
  color = 'primary',
  message,
  isVisible = true,
  className,
  ...props
}) => {
  if (!isVisible) return null;

  switch (type) {
    case 'dots':
      return <LoadingDots size={size} color={color} className={className} />;
    case 'skeleton':
      return <LoadingSkeleton className={className} {...props} />;
    case 'card':
      return <LoadingCard className={className} {...props} />;
    case 'overlay':
      return <LoadingOverlay isVisible={true} message={message} className={className} />;
    case 'page':
      return <LoadingPage message={message} className={className} />;
    case 'spinner':
    default:
      return <LoadingSpinner size={size} color={color} className={className} />;
  }
};

export default Loading;