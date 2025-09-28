'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useConnectionQuality } from '@/hooks/useConnectionQuality';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';
import offlineStorage from '@/lib/offlineStorage';

interface NetworkContextType {
  networkStatus: ReturnType<typeof useNetworkStatus>;
  connectionQuality: ReturnType<typeof useConnectionQuality>;
  offlineSync: ReturnType<typeof useOfflineSync>;
  registerServiceWorker: () => Promise<ServiceWorkerRegistration | null>;
  showDataSaverRecommendation: boolean;
  dismissDataSaverRecommendation: () => void;
}

const NetworkContext = createContext<NetworkContextType | null>(null);

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}

interface NetworkProviderProps {
  children: React.ReactNode;
}

export function NetworkProvider({ children }: NetworkProviderProps) {
  const networkStatus = useNetworkStatus();
  const connectionQuality = useConnectionQuality();
  const offlineSync = useOfflineSync();
  const [showDataSaverRecommendation, setShowDataSaverRecommendation] = useState(false);
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration | null>(null);

  /**
   * Register service worker for offline functionality
   */
  const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('Service worker registered successfully:', registration);

        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is available
                console.log('New service worker available');

                // Could show an update notification here
                if (window.confirm('New version available. Refresh to update?')) {
                  window.location.reload();
                }
              }
            });
          }
        });

        setServiceWorkerRegistration(registration);
        return registration;
      } catch (error) {
        console.error('Service worker registration failed:', error);
        return null;
      }
    }
    return null;
  };

  /**
   * Dismiss data saver recommendation
   */
  const dismissDataSaverRecommendation = () => {
    setShowDataSaverRecommendation(false);

    // Remember user's choice
    try {
      localStorage.setItem('whstudio-data-saver-dismissed', 'true');
    } catch (error) {
      console.warn('Failed to save data saver preference:', error);
    }
  };

  // Initialize offline storage and service worker
  useEffect(() => {
    const initializeOfflineFeatures = async () => {
      try {
        // Initialize offline storage
        await offlineStorage.init();
        console.log('Offline storage initialized');

        // Register service worker
        await registerServiceWorker();

        // Check for background sync support
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
          console.log('Background sync supported');
        }
      } catch (error) {
        console.error('Failed to initialize offline features:', error);
      }
    };

    initializeOfflineFeatures();
  }, []);

  // Show data saver recommendation based on connection quality
  useEffect(() => {
    const shouldShow = connectionQuality.shouldRecommendDataSaver();

    if (shouldShow) {
      // Check if user has already dismissed this recommendation
      try {
        const dismissed = localStorage.getItem('whstudio-data-saver-dismissed');
        if (!dismissed) {
          setShowDataSaverRecommendation(true);
        }
      } catch (error) {
        setShowDataSaverRecommendation(true);
      }
    } else {
      setShowDataSaverRecommendation(false);
    }
  }, [connectionQuality]);

  // Handle service worker messages
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'CACHE_UPDATED') {
          console.log('Cache updated for:', event.data.url);
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);

      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, []);

  // Performance monitoring for connection quality
  useEffect(() => {
    const recordApiPerformance = (event: PerformanceEntry) => {
      if (event.name.includes('/api/')) {
        const loadTime = event.duration;
        const success = !event.name.includes('error');

        connectionQuality.recordMetrics(
          loadTime,
          success,
          loadTime > 30000, // Consider 30s+ as timeout
          0, // bytes transferred (would need to be measured separately)
          false // not from cache (would need to be determined)
        );
      }
    };

    // Monitor performance
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(recordApiPerformance);
      });

      observer.observe({ entryTypes: ['navigation', 'resource'] });

      return () => observer.disconnect();
    }
  }, [connectionQuality]);

  const contextValue: NetworkContextType = {
    networkStatus,
    connectionQuality,
    offlineSync,
    registerServiceWorker,
    showDataSaverRecommendation,
    dismissDataSaverRecommendation,
  };

  return (
    <NetworkContext.Provider value={contextValue}>
      {children}

      {/* Offline Indicator */}
      <OfflineIndicator position="floating" showWhenOnline={false} />

      {/* Data Saver Recommendation */}
      {showDataSaverRecommendation && (
        <div className="fixed bottom-24 left-4 right-4 z-50">
          <div className="bg-[color-mix(in srgb,var(--color-warning) 15%,var(--color-bg-surface))] border border-[color-mix(in srgb,var(--color-warning) 25%,transparent)] rounded-lg p-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="text-[var(--color-warning)]">⚡</div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  Enable Data Saver?
                </h4>
                <p className="text-xs text-[var(--color-text-secondary)] mb-3">
                  Your connection seems slow. Enable data saver mode for better performance.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      connectionQuality.updateUserPreferences({ dataSaverMode: true });
                      dismissDataSaverRecommendation();
                    }}
                    className="px-3 py-1 bg-[var(--color-accent-blue)] text-black rounded text-xs font-medium hover:bg-[color-mix(in srgb,var(--color-accent-blue) 90%,white 10%)] transition-colors"
                  >
                    Enable
                  </button>
                  <button
                    onClick={dismissDataSaverRecommendation}
                    className="px-3 py-1 bg-[color-mix(in srgb,var(--color-text-secondary) 15%,transparent)] text-[var(--color-text-primary)] rounded text-xs font-medium hover:bg-[color-mix(in srgb,var(--color-text-secondary) 25%,transparent)] transition-colors"
                  >
                    Not Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </NetworkContext.Provider>
  );
}

export default NetworkProvider;