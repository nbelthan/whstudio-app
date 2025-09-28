'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Wifi, WifiOff, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { useConnectionQuality } from '@/hooks/useConnectionQuality';
import { cn } from '@/lib/utils';

interface NetworkAwareLoadingProps {
  isLoading: boolean;
  error?: string | null;
  retryCount?: number;
  onRetry?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  progressValue?: number;
  showNetworkStatus?: boolean;
  loadingText?: string;
  errorText?: string;
  retryText?: string;
  children?: React.ReactNode;
}

export function NetworkAwareLoading({
  isLoading,
  error,
  retryCount = 0,
  onRetry,
  className,
  size = 'md',
  showProgress = false,
  progressValue = 0,
  showNetworkStatus = true,
  loadingText,
  errorText,
  retryText = 'Retry',
  children,
}: NetworkAwareLoadingProps) {
  const { isOnline, quality, adaptations, shouldRecommendDataSaver } = useConnectionQuality();
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Size configurations
  const sizeConfig = {
    sm: {
      spinner: 'w-4 h-4',
      text: 'text-xs',
      padding: 'p-2',
      icon: 16,
    },
    md: {
      spinner: 'w-6 h-6',
      text: 'text-sm',
      padding: 'p-4',
      icon: 20,
    },
    lg: {
      spinner: 'w-8 h-8',
      text: 'text-base',
      padding: 'p-6',
      icon: 24,
    },
  };

  const config = sizeConfig[size];

  // Estimate loading time based on connection quality
  useEffect(() => {
    if (!isLoading) {
      setEstimatedTime(null);
      setElapsedTime(0);
      return;
    }

    const estimates = {
      excellent: 2000,
      good: 4000,
      fair: 8000,
      poor: 15000,
      offline: 30000,
    };

    setEstimatedTime(estimates[quality]);

    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [isLoading, quality]);

  // Get loading message based on connection quality and elapsed time
  const getLoadingMessage = () => {
    if (loadingText) return loadingText;

    if (!isOnline) {
      return 'Waiting for connection...';
    }

    if (quality === 'poor' && elapsedTime > 5000) {
      return 'Slow connection detected...';
    }

    if (elapsedTime > (estimatedTime || 5000)) {
      return 'Taking longer than expected...';
    }

    const messages = {
      excellent: 'Loading...',
      good: 'Loading...',
      fair: 'Loading (may take a moment)...',
      poor: 'Loading (slow connection)...',
      offline: 'Waiting for connection...',
    };

    return messages[quality];
  };

  // Get error message with network context
  const getErrorMessage = () => {
    if (errorText) return errorText;
    if (!error) return null;

    if (!isOnline) {
      return 'No internet connection. Please check your connection and try again.';
    }

    if (quality === 'poor') {
      return 'Request failed due to poor connection. Please try again.';
    }

    return error;
  };

  // Calculate progress based on elapsed time and estimated time
  const calculateProgress = () => {
    if (showProgress && progressValue !== undefined) {
      return progressValue;
    }

    if (!estimatedTime || !isLoading) return 0;

    const progress = Math.min((elapsedTime / estimatedTime) * 100, 95);
    return Math.round(progress);
  };

  // Network status indicator
  const NetworkStatusIcon = () => {
    if (!showNetworkStatus) return null;

    const icons = {
      excellent: CheckCircle,
      good: Wifi,
      fair: Wifi,
      poor: AlertTriangle,
      offline: WifiOff,
    };

    const colors = {
      excellent: 'text-[var(--color-success)]',
      good: 'text-[var(--color-accent-blue)]',
      fair: 'text-[var(--color-warning)]',
      poor: 'text-[var(--color-error)]',
      offline: 'text-[var(--color-text-secondary)]',
    };

    const Icon = icons[quality];

    return (
      <div className={cn('flex items-center gap-1', colors[quality])}>
        <Icon size={config.icon * 0.75} />
        <span className={cn(config.text, 'capitalize')}>
          {isOnline ? quality : 'offline'}
        </span>
      </div>
    );
  };

  // Show error state
  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center text-center', config.padding, className)}>
        <AlertTriangle size={config.icon * 1.5} className="text-[var(--color-error)] mb-2" />

        <p className={cn(config.text, 'text-[var(--color-error)] mb-2')}>
          {getErrorMessage()}
        </p>

        {retryCount > 0 && (
          <p className={cn(config.text, 'text-[var(--color-text-secondary)] mb-2')}>
            Retry attempt: {retryCount}
          </p>
        )}

        <NetworkStatusIcon />

        {shouldRecommendDataSaver() && (
          <p className={cn(config.text, 'text-[var(--color-warning)] mt-2')}>
            Consider enabling data saver mode for better performance
          </p>
        )}

        {onRetry && (
          <button
            onClick={onRetry}
            className={cn(
              'mt-4 px-4 py-2 bg-[var(--color-accent-blue)] text-black rounded-lg',
              'hover:bg-[color-mix(in srgb,var(--color-accent-blue) 90%,white 10%)]',
              'transition-colors duration-200',
              config.text
            )}
          >
            {retryText}
          </button>
        )}
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    const progress = calculateProgress();

    return (
      <div className={cn('flex flex-col items-center justify-center text-center', config.padding, className)}>
        {/* Main spinner */}
        <div className="relative mb-4">
          <Loader2 size={config.icon * 1.5} className={cn(config.spinner, 'animate-spin text-[var(--color-accent-blue)]')} />

          {/* Progress ring for poor connections */}
          {(quality === 'poor' || quality === 'fair') && showProgress && (
            <svg
              className="absolute inset-0 w-full h-full -rotate-90"
              viewBox="0 0 36 36"
            >
              <path
                className="text-[color-mix(in srgb,var(--color-accent-blue) 20%,transparent)]"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                className="text-[var(--color-accent-blue)]"
                strokeDasharray={`${progress}, 100`}
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>

        {/* Loading message */}
        <p className={cn(config.text, 'text-[var(--color-text-primary)] mb-2')}>
          {getLoadingMessage()}
        </p>

        {/* Progress percentage for slow connections */}
        {(quality === 'poor' || quality === 'fair') && showProgress && progress > 0 && (
          <p className={cn(config.text, 'text-[var(--color-text-secondary)] mb-2')}>
            {progress}%
          </p>
        )}

        {/* Time indicators */}
        {estimatedTime && elapsedTime > 3000 && (
          <div className={cn('flex items-center gap-2 mb-2', config.text, 'text-[var(--color-text-secondary)]')}>
            <Clock size={config.icon * 0.75} />
            <span>
              {Math.round(elapsedTime / 1000)}s
              {estimatedTime && ` / ~${Math.round(estimatedTime / 1000)}s`}
            </span>
          </div>
        )}

        {/* Network status */}
        <NetworkStatusIcon />

        {/* Data saver recommendation */}
        {shouldRecommendDataSaver() && quality === 'poor' && (
          <p className={cn(config.text, 'text-[var(--color-warning)] mt-2')}>
            Enable data saver for faster loading
          </p>
        )}

        {/* Retry count for failed attempts */}
        {retryCount > 0 && (
          <p className={cn(config.text, 'text-[var(--color-text-secondary)] mt-1')}>
            Retry {retryCount}
          </p>
        )}
      </div>
    );
  }

  // Render children when not loading and no error
  return <>{children}</>;
}

interface ProgressiveLoadingProps {
  stages: Array<{
    name: string;
    duration: number;
    completed: boolean;
  }>;
  currentStage: number;
  className?: string;
}

export function ProgressiveLoading({ stages, currentStage, className }: ProgressiveLoadingProps) {
  const { quality } = useConnectionQuality();

  return (
    <div className={cn('space-y-3', className)}>
      {stages.map((stage, index) => {
        const isActive = index === currentStage;
        const isCompleted = stage.completed;
        const isPending = index > currentStage;

        return (
          <div
            key={stage.name}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg transition-all duration-200',
              {
                'bg-[color-mix(in srgb,var(--color-accent-blue) 10%,transparent)] border border-[color-mix(in srgb,var(--color-accent-blue) 25%,transparent)]': isActive,
                'bg-[color-mix(in srgb,var(--color-success) 10%,transparent)] border border-[color-mix(in srgb,var(--color-success) 25%,transparent)]': isCompleted,
                'bg-[color-mix(in srgb,var(--color-text-secondary) 5%,transparent)] border border-[color-mix(in srgb,var(--color-text-secondary) 15%,transparent)]': isPending,
              }
            )}
          >
            {/* Status icon */}
            <div className="flex-shrink-0">
              {isCompleted ? (
                <CheckCircle size={20} className="text-[var(--color-success)]" />
              ) : isActive ? (
                <Loader2 size={20} className="text-[var(--color-accent-blue)] animate-spin" />
              ) : (
                <Clock size={20} className="text-[var(--color-text-secondary)]" />
              )}
            </div>

            {/* Stage info */}
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                {stage.name}
              </p>
              {isActive && quality === 'poor' && (
                <p className="text-xs text-[var(--color-warning)]">
                  May take longer due to slow connection
                </p>
              )}
            </div>

            {/* Duration indicator */}
            {(isActive || isCompleted) && (
              <div className="text-xs text-[var(--color-text-secondary)]">
                ~{Math.round(stage.duration / 1000)}s
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface SkeletonLoadingProps {
  rows?: number;
  avatar?: boolean;
  className?: string;
  adaptToConnection?: boolean;
}

export function SkeletonLoading({
  rows = 3,
  avatar = false,
  className,
  adaptToConnection = true
}: SkeletonLoadingProps) {
  const { quality, adaptations } = useConnectionQuality();

  // Reduce animation on poor connections
  const shouldAnimate = adaptToConnection ? adaptations.enableAnimations : true;

  return (
    <div className={cn('space-y-3', className)}>
      {avatar && (
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-full bg-[color-mix(in srgb,var(--color-text-secondary) 15%,transparent)]',
            shouldAnimate && 'animate-pulse'
          )} />
          <div className="space-y-2 flex-1">
            <div className={cn(
              'h-4 bg-[color-mix(in srgb,var(--color-text-secondary) 15%,transparent)] rounded w-1/4',
              shouldAnimate && 'animate-pulse'
            )} />
            <div className={cn(
              'h-3 bg-[color-mix(in srgb,var(--color-text-secondary) 10%,transparent)] rounded w-1/3',
              shouldAnimate && 'animate-pulse'
            )} />
          </div>
        </div>
      )}

      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="space-y-2">
          <div className={cn(
            'h-4 bg-[color-mix(in srgb,var(--color-text-secondary) 15%,transparent)] rounded',
            shouldAnimate && 'animate-pulse'
          )} style={{ width: `${75 + Math.random() * 20}%` }} />
          <div className={cn(
            'h-4 bg-[color-mix(in srgb,var(--color-text-secondary) 10%,transparent)] rounded',
            shouldAnimate && 'animate-pulse'
          )} style={{ width: `${50 + Math.random() * 30}%` }} />
        </div>
      ))}
    </div>
  );
}

export default NetworkAwareLoading;