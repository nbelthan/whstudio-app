'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { useNetworkStatus, NetworkQuality } from '@/hooks/useNetworkStatus';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  className?: string;
  showWhenOnline?: boolean;
  position?: 'top' | 'bottom' | 'floating';
  compact?: boolean;
}

const QUALITY_CONFIG = {
  excellent: {
    icon: CheckCircle,
    label: 'Excellent Connection',
    color: 'text-[var(--color-success)] bg-[color-mix(in srgb,var(--color-success) 15%,transparent)]',
    border: 'border-[color-mix(in srgb,var(--color-success) 25%,transparent)]',
    show: false,
  },
  good: {
    icon: Wifi,
    label: 'Good Connection',
    color: 'text-[var(--color-accent-blue)] bg-[color-mix(in srgb,var(--color-accent-blue) 15%,transparent)]',
    border: 'border-[color-mix(in srgb,var(--color-accent-blue) 25%,transparent)]',
    show: false,
  },
  fair: {
    icon: Wifi,
    label: 'Fair Connection',
    color: 'text-[var(--color-warning)] bg-[color-mix(in srgb,var(--color-warning) 15%,transparent)]',
    border: 'border-[color-mix(in srgb,var(--color-warning) 25%,transparent)]',
    show: true,
  },
  poor: {
    icon: AlertTriangle,
    label: 'Poor Connection',
    color: 'text-[var(--color-error)] bg-[color-mix(in srgb,var(--color-error) 15%,transparent)]',
    border: 'border-[color-mix(in srgb,var(--color-error) 25%,transparent)]',
    show: true,
  },
  offline: {
    icon: WifiOff,
    label: 'No Connection',
    color: 'text-[var(--color-text-primary)] bg-[color-mix(in srgb,var(--color-text-secondary) 15%,transparent)]',
    border: 'border-[color-mix(in srgb,var(--color-text-secondary) 25%,transparent)]',
    show: true,
  },
};

export function OfflineIndicator({
  className,
  showWhenOnline = false,
  position = 'floating',
  compact = false,
}: OfflineIndicatorProps) {
  const { isOnline, quality, rtt, downlink, effectiveType, refreshNetworkStatus } = useNetworkStatus();
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const qualityConfig = QUALITY_CONFIG[quality];
  const Icon = qualityConfig.icon;

  useEffect(() => {
    const shouldShow = !isOnline || qualityConfig.show || showWhenOnline;
    setIsVisible(shouldShow);

    // Auto-hide after 5 seconds for good connections when showWhenOnline is true
    if (shouldShow && showWhenOnline && (quality === 'excellent' || quality === 'good')) {
      const timer = setTimeout(() => {
        if (quality === 'excellent' || quality === 'good') {
          setIsVisible(false);
        }
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isOnline, quality, qualityConfig.show, showWhenOnline]);

  if (!isVisible) return null;

  const handleClick = () => {
    if (compact) {
      setIsExpanded(!isExpanded);
    } else {
      refreshNetworkStatus();
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'fixed top-16 left-1/2 -translate-x-1/2 z-50';
      case 'bottom':
        return 'fixed bottom-20 left-1/2 -translate-x-1/2 z-50';
      case 'floating':
      default:
        return 'fixed top-20 right-4 z-50';
    }
  };

  const formatConnectionInfo = () => {
    if (!isOnline) return 'Offline';

    const parts = [];
    if (rtt) parts.push(`${rtt}ms`);
    if (downlink && downlink < 10) parts.push(`${downlink.toFixed(1)}Mbps`);
    if (effectiveType && effectiveType !== '4g') parts.push(effectiveType.toUpperCase());

    return parts.length > 0 ? parts.join(' • ') : qualityConfig.label;
  };

  if (compact) {
    return (
      <div className={cn(getPositionClasses(), className)}>
        <div
          onClick={handleClick}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border backdrop-blur-sm',
            'cursor-pointer transition-all duration-200 hover:scale-105',
            qualityConfig.color,
            qualityConfig.border,
            'shadow-lg'
          )}
        >
          <Icon size={16} className="flex-shrink-0" />

          {isExpanded && (
            <div className="flex flex-col text-xs">
              <span className="font-medium">{qualityConfig.label}</span>
              <span className="opacity-75">{formatConnectionInfo()}</span>
            </div>
          )}

          {!isExpanded && !isOnline && (
            <span className="text-sm font-medium">Offline</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(getPositionClasses(), className)}>
      <div
        onClick={handleClick}
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm',
          'cursor-pointer transition-all duration-200 hover:scale-105',
          qualityConfig.color,
          qualityConfig.border,
          'shadow-lg min-w-[200px]'
        )}
      >
        <Icon size={20} className="flex-shrink-0" />

        <div className="flex flex-col flex-1">
          <span className="font-medium text-sm">{qualityConfig.label}</span>
          <span className="text-xs opacity-75">{formatConnectionInfo()}</span>
        </div>

        {!isOnline && (
          <div className="flex items-center gap-1 text-xs opacity-75">
            <Clock size={12} />
            <span>Reconnecting...</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface NetworkStatusBadgeProps {
  className?: string;
  showLabel?: boolean;
}

export function NetworkStatusBadge({ className, showLabel = true }: NetworkStatusBadgeProps) {
  const { isOnline, quality, isPoorConnection } = useNetworkStatus();

  // Only show for poor connections or offline
  if (isOnline && !isPoorConnection) return null;

  const qualityConfig = QUALITY_CONFIG[quality];
  const Icon = qualityConfig.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs',
        qualityConfig.color,
        qualityConfig.border,
        'border',
        className
      )}
    >
      <Icon size={12} />
      {showLabel && <span>{quality === 'offline' ? 'Offline' : 'Slow'}</span>}
    </div>
  );
}

interface ConnectionQualityBarProps {
  className?: string;
  showLabel?: boolean;
}

export function ConnectionQualityBar({ className, showLabel = true }: ConnectionQualityBarProps) {
  const { quality, isOnline, rtt } = useNetworkStatus();

  const getQualityLevel = (quality: NetworkQuality): number => {
    switch (quality) {
      case 'excellent': return 4;
      case 'good': return 3;
      case 'fair': return 2;
      case 'poor': return 1;
      case 'offline': return 0;
      default: return 0;
    }
  };

  const qualityLevel = getQualityLevel(quality);
  const qualityConfig = QUALITY_CONFIG[quality];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={cn(
              'w-1 rounded-full transition-colors duration-200',
              level <= qualityLevel
                ? qualityConfig.color.split(' ')[0] // Extract just the text color class
                : 'bg-[color-mix(in srgb,var(--color-text-secondary) 25%,transparent)]',
              {
                'h-2': level === 1,
                'h-3': level === 2,
                'h-4': level === 3,
                'h-5': level === 4,
              }
            )}
            style={{
              backgroundColor: level <= qualityLevel
                ? 'currentColor'
                : undefined
            }}
          />
        ))}
      </div>

      {showLabel && (
        <span className={cn('text-xs', qualityConfig.color.split(' ')[0])}>
          {isOnline ? `${rtt}ms` : 'Offline'}
        </span>
      )}
    </div>
  );
}

export default OfflineIndicator;