'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type NetworkQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';

export interface NetworkStatusState {
  isOnline: boolean;
  quality: NetworkQuality;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
  isSlowConnection: boolean;
  isPoorConnection: boolean;
}

interface ConnectionInfo {
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g';
  downlink: number;
  rtt: number;
  saveData: boolean;
}

const NETWORK_QUALITY_THRESHOLDS = {
  excellent: { rtt: 50, downlink: 10 },
  good: { rtt: 150, downlink: 2 },
  fair: { rtt: 300, downlink: 0.5 },
  poor: { rtt: 500, downlink: 0.1 }
};

const PING_INTERVAL = 30000; // 30 seconds
const PING_TIMEOUT = 5000; // 5 seconds

/**
 * Custom hook for monitoring network status and connection quality
 * Provides real-time information about network connectivity and performance
 */
export function useNetworkStatus() {
  const [networkState, setNetworkState] = useState<NetworkStatusState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    quality: 'excellent',
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    saveData: false,
    isSlowConnection: false,
    isPoorConnection: false,
  });

  const pingTimeoutRef = useRef<NodeJS.Timeout>();
  const measurementIntervalRef = useRef<NodeJS.Timeout>();
  const lastPingTime = useRef<number>(0);

  /**
   * Determine network quality based on RTT and downlink speed
   */
  const calculateNetworkQuality = useCallback((rtt: number, downlink: number): NetworkQuality => {
    if (rtt <= NETWORK_QUALITY_THRESHOLDS.excellent.rtt && downlink >= NETWORK_QUALITY_THRESHOLDS.excellent.downlink) {
      return 'excellent';
    }
    if (rtt <= NETWORK_QUALITY_THRESHOLDS.good.rtt && downlink >= NETWORK_QUALITY_THRESHOLDS.good.downlink) {
      return 'good';
    }
    if (rtt <= NETWORK_QUALITY_THRESHOLDS.fair.rtt && downlink >= NETWORK_QUALITY_THRESHOLDS.fair.downlink) {
      return 'fair';
    }
    return 'poor';
  }, []);

  /**
   * Get connection information from navigator.connection API
   */
  const getConnectionInfo = useCallback((): Partial<ConnectionInfo> => {
    if (typeof navigator === 'undefined' || !('connection' in navigator)) {
      return {};
    }

    const connection = (navigator as any).connection;
    return {
      effectiveType: connection?.effectiveType || '4g',
      downlink: connection?.downlink || 10,
      rtt: connection?.rtt || 50,
      saveData: connection?.saveData || false,
    };
  }, []);

  /**
   * Measure actual network latency by pinging a fast endpoint
   */
  const measureLatency = useCallback(async (): Promise<number> => {
    const startTime = performance.now();

    try {
      // Use a small favicon request to measure latency
      const response = await fetch('/favicon.ico?' + Date.now(), {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(PING_TIMEOUT),
      });

      if (response.ok) {
        return Math.round(performance.now() - startTime);
      }
    } catch (error) {
      // Fallback to a simple image ping
      try {
        const img = new Image();
        const imagePromise = new Promise<number>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timeout')), PING_TIMEOUT);

          img.onload = () => {
            clearTimeout(timeout);
            resolve(Math.round(performance.now() - startTime));
          };

          img.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('Failed to load image'));
          };
        });

        img.src = '/icon.svg?' + Date.now();
        return await imagePromise;
      } catch (fallbackError) {
        console.warn('Network latency measurement failed:', fallbackError);
        return 1000; // Default high latency for failed measurements
      }
    }

    return 1000; // Default high latency for failed measurements
  }, []);

  /**
   * Update network state with current measurements
   */
  const updateNetworkState = useCallback(async () => {
    const isOnline = navigator.onLine;

    if (!isOnline) {
      setNetworkState(prev => ({
        ...prev,
        isOnline: false,
        quality: 'offline',
        isSlowConnection: true,
        isPoorConnection: true,
      }));
      return;
    }

    const connectionInfo = getConnectionInfo();
    let measuredRtt = connectionInfo.rtt || 50;

    // Measure actual latency if we haven't measured recently
    const now = Date.now();
    if (now - lastPingTime.current > PING_INTERVAL) {
      try {
        measuredRtt = await measureLatency();
        lastPingTime.current = now;
      } catch (error) {
        console.warn('Failed to measure network latency:', error);
      }
    }

    const downlink = connectionInfo.downlink || 10;
    const quality = calculateNetworkQuality(measuredRtt, downlink);
    const isSlowConnection = quality === 'poor' || connectionInfo.effectiveType === '2g' || connectionInfo.effectiveType === 'slow-2g';
    const isPoorConnection = quality === 'poor' || measuredRtt > 500;

    setNetworkState(prev => ({
      ...prev,
      isOnline: true,
      quality,
      effectiveType: connectionInfo.effectiveType || '4g',
      downlink,
      rtt: measuredRtt,
      saveData: connectionInfo.saveData || false,
      isSlowConnection,
      isPoorConnection,
    }));
  }, [getConnectionInfo, calculateNetworkQuality, measureLatency]);

  /**
   * Start periodic network quality measurements
   */
  const startNetworkMonitoring = useCallback(() => {
    // Clear any existing intervals
    if (measurementIntervalRef.current) {
      clearInterval(measurementIntervalRef.current);
    }

    // Delay initial measurement to prevent blocking initial render
    setTimeout(() => {
      updateNetworkState();

      // Set up periodic measurements
      measurementIntervalRef.current = setInterval(() => {
        updateNetworkState();
      }, PING_INTERVAL);
    }, 500);
  }, [updateNetworkState]);

  /**
   * Stop network monitoring
   */
  const stopNetworkMonitoring = useCallback(() => {
    if (measurementIntervalRef.current) {
      clearInterval(measurementIntervalRef.current);
      measurementIntervalRef.current = undefined;
    }
    if (pingTimeoutRef.current) {
      clearTimeout(pingTimeoutRef.current);
      pingTimeoutRef.current = undefined;
    }
  }, []);

  /**
   * Force a network quality check
   */
  const refreshNetworkStatus = useCallback(() => {
    updateNetworkState();
  }, [updateNetworkState]);

  useEffect(() => {
    const handleOnline = () => {
      setNetworkState(prev => ({ ...prev, isOnline: true }));
      updateNetworkState();
    };

    const handleOffline = () => {
      setNetworkState(prev => ({
        ...prev,
        isOnline: false,
        quality: 'offline',
        isSlowConnection: true,
        isPoorConnection: true,
      }));
    };

    const handleConnectionChange = () => {
      // Debounce connection changes
      if (pingTimeoutRef.current) {
        clearTimeout(pingTimeoutRef.current);
      }

      pingTimeoutRef.current = setTimeout(() => {
        updateNetworkState();
      }, 500);
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes if supported
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection?.addEventListener('change', handleConnectionChange);
    }

    // Start monitoring
    startNetworkMonitoring();

    return () => {
      // Cleanup
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        connection?.removeEventListener('change', handleConnectionChange);
      }

      stopNetworkMonitoring();
    };
  }, [updateNetworkState, startNetworkMonitoring, stopNetworkMonitoring]);

  return {
    ...networkState,
    refreshNetworkStatus,
    startMonitoring: startNetworkMonitoring,
    stopMonitoring: stopNetworkMonitoring,
  };
}

export default useNetworkStatus;