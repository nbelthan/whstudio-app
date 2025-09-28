'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNetworkStatus, NetworkQuality } from './useNetworkStatus';

export interface ConnectionAdaptation {
  imageQuality: 'high' | 'medium' | 'low';
  enableAnimations: boolean;
  enableAutoPlay: boolean;
  loadingStrategy: 'eager' | 'lazy' | 'progressive';
  requestTimeout: number;
  retryAttempts: number;
  enablePrefetch: boolean;
  enableBackgroundSync: boolean;
  recommendDataSaver: boolean;
}

export interface PerformanceMetrics {
  avgLoadTime: number;
  successRate: number;
  errorRate: number;
  timeoutRate: number;
  bytesTransferred: number;
  requestCount: number;
  cacheHitRate: number;
}

const CONNECTION_ADAPTATIONS: Record<NetworkQuality, ConnectionAdaptation> = {
  excellent: {
    imageQuality: 'high',
    enableAnimations: true,
    enableAutoPlay: true,
    loadingStrategy: 'eager',
    requestTimeout: 5000,
    retryAttempts: 2,
    enablePrefetch: true,
    enableBackgroundSync: true,
    recommendDataSaver: false,
  },
  good: {
    imageQuality: 'high',
    enableAnimations: true,
    enableAutoPlay: true,
    loadingStrategy: 'lazy',
    requestTimeout: 8000,
    retryAttempts: 3,
    enablePrefetch: true,
    enableBackgroundSync: true,
    recommendDataSaver: false,
  },
  fair: {
    imageQuality: 'medium',
    enableAnimations: false,
    enableAutoPlay: false,
    loadingStrategy: 'lazy',
    requestTimeout: 12000,
    retryAttempts: 4,
    enablePrefetch: false,
    enableBackgroundSync: true,
    recommendDataSaver: true,
  },
  poor: {
    imageQuality: 'low',
    enableAnimations: false,
    enableAutoPlay: false,
    loadingStrategy: 'progressive',
    requestTimeout: 20000,
    retryAttempts: 5,
    enablePrefetch: false,
    enableBackgroundSync: false,
    recommendDataSaver: true,
  },
  offline: {
    imageQuality: 'low',
    enableAnimations: false,
    enableAutoPlay: false,
    loadingStrategy: 'progressive',
    requestTimeout: 30000,
    retryAttempts: 1,
    enablePrefetch: false,
    enableBackgroundSync: false,
    recommendDataSaver: true,
  },
};

/**
 * Hook for managing connection quality and adapting app behavior
 */
export function useConnectionQuality() {
  const networkStatus = useNetworkStatus();
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    avgLoadTime: 0,
    successRate: 100,
    errorRate: 0,
    timeoutRate: 0,
    bytesTransferred: 0,
    requestCount: 0,
    cacheHitRate: 0,
  });

  const [adaptations, setAdaptations] = useState<ConnectionAdaptation>(
    CONNECTION_ADAPTATIONS[networkStatus.quality]
  );

  const [userPreferences, setUserPreferences] = useState({
    dataSaverMode: false,
    allowAdaptations: true,
    preferQuality: false,
  });

  const performanceHistory = useRef<Array<{ timestamp: number; loadTime: number; success: boolean; timeout: boolean }>>([]);
  const metricsUpdateInterval = useRef<NodeJS.Timeout>();

  /**
   * Update adaptations based on network quality and user preferences
   */
  const updateAdaptations = useCallback(() => {
    let newAdaptations = { ...CONNECTION_ADAPTATIONS[networkStatus.quality] };

    // Apply user preferences
    if (userPreferences.dataSaverMode) {
      newAdaptations = {
        ...newAdaptations,
        imageQuality: 'low',
        enableAnimations: false,
        enableAutoPlay: false,
        enablePrefetch: false,
        recommendDataSaver: true,
      };
    }

    if (!userPreferences.allowAdaptations) {
      newAdaptations = CONNECTION_ADAPTATIONS.excellent;
    }

    if (userPreferences.preferQuality) {
      newAdaptations.imageQuality = 'high';
      newAdaptations.enableAnimations = true;
    }

    // Further adaptations based on performance metrics
    if (metrics.errorRate > 20) {
      newAdaptations.retryAttempts = Math.min(newAdaptations.retryAttempts + 2, 8);
      newAdaptations.requestTimeout = Math.min(newAdaptations.requestTimeout * 1.5, 30000);
    }

    if (metrics.avgLoadTime > 10000) {
      newAdaptations.imageQuality = 'low';
      newAdaptations.enablePrefetch = false;
    }

    setAdaptations(newAdaptations);
  }, [networkStatus.quality, userPreferences, metrics]);

  /**
   * Record performance metrics for a request
   */
  const recordMetrics = useCallback((
    loadTime: number,
    success: boolean,
    timeout: boolean = false,
    bytesTransferred: number = 0,
    fromCache: boolean = false
  ) => {
    const timestamp = Date.now();

    // Add to history
    performanceHistory.current.push({
      timestamp,
      loadTime,
      success,
      timeout,
    });

    // Keep only last 100 entries
    if (performanceHistory.current.length > 100) {
      performanceHistory.current = performanceHistory.current.slice(-100);
    }

    // Update metrics
    setMetrics(prev => {
      const totalRequests = prev.requestCount + 1;
      const totalBytes = prev.bytesTransferred + bytesTransferred;

      const recentHistory = performanceHistory.current.slice(-20); // Last 20 requests
      const avgLoadTime = recentHistory.reduce((sum, entry) => sum + entry.loadTime, 0) / recentHistory.length;
      const successCount = recentHistory.filter(entry => entry.success).length;
      const timeoutCount = recentHistory.filter(entry => entry.timeout).length;

      const successRate = (successCount / recentHistory.length) * 100;
      const errorRate = ((recentHistory.length - successCount) / recentHistory.length) * 100;
      const timeoutRate = (timeoutCount / recentHistory.length) * 100;

      return {
        avgLoadTime,
        successRate,
        errorRate,
        timeoutRate,
        bytesTransferred: totalBytes,
        requestCount: totalRequests,
        cacheHitRate: fromCache ? (prev.cacheHitRate * (totalRequests - 1) + 100) / totalRequests : (prev.cacheHitRate * (totalRequests - 1)) / totalRequests,
      };
    });
  }, []);

  /**
   * Get optimal image size based on connection quality
   */
  const getOptimalImageSize = useCallback((baseWidth: number, baseHeight: number) => {
    const quality = adaptations.imageQuality;

    switch (quality) {
      case 'low':
        return { width: Math.floor(baseWidth * 0.5), height: Math.floor(baseHeight * 0.5) };
      case 'medium':
        return { width: Math.floor(baseWidth * 0.75), height: Math.floor(baseHeight * 0.75) };
      case 'high':
      default:
        return { width: baseWidth, height: baseHeight };
    }
  }, [adaptations.imageQuality]);

  /**
   * Get optimal loading strategy for resources
   */
  const getLoadingStrategy = useCallback((priority: 'high' | 'medium' | 'low') => {
    if (!adaptations.enablePrefetch && priority === 'low') {
      return 'none';
    }

    if (adaptations.loadingStrategy === 'progressive') {
      return priority === 'high' ? 'lazy' : 'none';
    }

    return adaptations.loadingStrategy;
  }, [adaptations.enablePrefetch, adaptations.loadingStrategy]);

  /**
   * Determine if feature should be enabled based on connection
   */
  const shouldEnableFeature = useCallback((feature: keyof Omit<ConnectionAdaptation, 'imageQuality' | 'loadingStrategy' | 'requestTimeout' | 'retryAttempts'>) => {
    return adaptations[feature];
  }, [adaptations]);

  /**
   * Get request configuration based on connection quality
   */
  const getRequestConfig = useCallback(() => {
    return {
      timeout: adaptations.requestTimeout,
      retries: adaptations.retryAttempts,
      cacheStrategy: adaptations.enablePrefetch ? 'cache-first' : 'network-first',
    };
  }, [adaptations]);

  /**
   * Check if data saver mode should be recommended
   */
  const shouldRecommendDataSaver = useCallback(() => {
    return adaptations.recommendDataSaver && !userPreferences.dataSaverMode;
  }, [adaptations.recommendDataSaver, userPreferences.dataSaverMode]);

  /**
   * Get performance advice based on current metrics
   */
  const getPerformanceAdvice = useCallback(() => {
    const advice: string[] = [];

    if (metrics.errorRate > 10) {
      advice.push('High error rate detected. Consider enabling data saver mode.');
    }

    if (metrics.avgLoadTime > 5000) {
      advice.push('Slow loading times detected. Reducing image quality may help.');
    }

    if (networkStatus.saveData && !userPreferences.dataSaverMode) {
      advice.push('Your device has data saver enabled. Enable app data saver for better experience.');
    }

    if (networkStatus.effectiveType === '2g' || networkStatus.effectiveType === 'slow-2g') {
      advice.push('Slow connection detected. Consider using offline mode for essential tasks.');
    }

    return advice;
  }, [metrics, networkStatus, userPreferences]);

  /**
   * Update user preferences
   */
  const updateUserPreferences = useCallback((newPreferences: Partial<typeof userPreferences>) => {
    setUserPreferences(prev => ({ ...prev, ...newPreferences }));

    // Save to localStorage
    try {
      const prefs = { ...userPreferences, ...newPreferences };
      localStorage.setItem('whstudio-connection-preferences', JSON.stringify(prefs));
    } catch (error) {
      console.warn('Failed to save connection preferences:', error);
    }
  }, [userPreferences]);

  // Update adaptations when network quality or preferences change
  useEffect(() => {
    updateAdaptations();
  }, [updateAdaptations]);

  // Load saved preferences on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('whstudio-connection-preferences');
      if (saved) {
        const preferences = JSON.parse(saved);
        setUserPreferences(prev => ({ ...prev, ...preferences }));
      }
    } catch (error) {
      console.warn('Failed to load connection preferences:', error);
    }
  }, []);

  // Start metrics collection interval
  useEffect(() => {
    metricsUpdateInterval.current = setInterval(() => {
      // Clean up old history entries (older than 5 minutes)
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      performanceHistory.current = performanceHistory.current.filter(
        entry => entry.timestamp > fiveMinutesAgo
      );
    }, 60000); // Clean up every minute

    return () => {
      if (metricsUpdateInterval.current) {
        clearInterval(metricsUpdateInterval.current);
      }
    };
  }, []);

  return {
    // Network status
    ...networkStatus,

    // Connection adaptations
    adaptations,

    // Performance metrics
    metrics,

    // User preferences
    userPreferences,
    updateUserPreferences,

    // Utility functions
    recordMetrics,
    getOptimalImageSize,
    getLoadingStrategy,
    shouldEnableFeature,
    getRequestConfig,
    shouldRecommendDataSaver,
    getPerformanceAdvice,

    // Quality indicators
    isHighQualityConnection: networkStatus.quality === 'excellent' || networkStatus.quality === 'good',
    isPoorQualityConnection: networkStatus.quality === 'poor' || networkStatus.quality === 'offline',
    shouldReduceQuality: adaptations.imageQuality !== 'high' || !adaptations.enableAnimations,
  };
}

/**
 * Higher-order component for wrapping components with connection awareness
 */
export function withConnectionQuality<P extends object>(
  Component: React.ComponentType<P & { connectionQuality: ReturnType<typeof useConnectionQuality> }>
) {
  return function ConnectionQualityWrapper(props: P) {
    const connectionQuality = useConnectionQuality();

    return <Component {...props} connectionQuality={connectionQuality} />;
  };
}

export default useConnectionQuality;