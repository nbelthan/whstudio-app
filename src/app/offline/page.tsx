'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { useNetwork } from '@/providers/NetworkProvider';
import { NetworkStatusBadge } from '@/components/ui/OfflineIndicator';
import offlineStorage from '@/lib/offlineStorage';

export default function OfflinePage() {
  const { networkStatus, offlineSync } = useNetwork();
  const [offlineStats, setOfflineStats] = useState({
    tasks: 0,
    submissions: 0,
    pendingActions: 0,
  });
  const [lastActivity, setLastActivity] = useState<string | null>(null);

  // Load offline statistics
  useEffect(() => {
    const loadStats = async () => {
      try {
        const stats = await offlineStorage.manager.getUsageStats();
        const syncStats = await offlineSync.getSyncStats();

        setOfflineStats({
          tasks: stats.tasks,
          submissions: stats.submissions,
          pendingActions: syncStats.pending,
        });

        // Get last activity from localStorage
        const lastSync = localStorage.getItem('whstudio-last-activity');
        if (lastSync) {
          const date = new Date(parseInt(lastSync));
          setLastActivity(date.toLocaleString());
        }
      } catch (error) {
        console.error('Failed to load offline stats:', error);
      }
    };

    loadStats();
  }, [offlineSync]);

  // Redirect when back online
  useEffect(() => {
    if (networkStatus.isOnline) {
      window.location.href = '/';
    }
  }, [networkStatus.isOnline]);

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-[color-mix(in srgb,var(--color-text-secondary) 10%,transparent)] flex items-center justify-center">
              <WifiOff size={40} className="text-[var(--color-text-secondary)]" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
            You're Offline
          </h1>

          <p className="text-[var(--color-text-secondary)] mb-6">
            No internet connection detected. You can still view cached content and any changes will sync when you're back online.
          </p>

          <NetworkStatusBadge className="inline-flex mb-6" />
        </div>

        {/* Offline Statistics */}
        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Available Offline
          </h2>

          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between p-3 bg-[color-mix(in srgb,var(--color-bg-surface) 80%,transparent)] rounded-lg border border-[color-mix(in srgb,var(--color-divider-low) 30%,transparent)]">
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-[var(--color-success)]" />
                <span className="text-[var(--color-text-primary)]">Cached Tasks</span>
              </div>
              <span className="text-[var(--color-text-secondary)] font-medium">
                {offlineStats.tasks}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-[color-mix(in srgb,var(--color-bg-surface) 80%,transparent)] rounded-lg border border-[color-mix(in srgb,var(--color-divider-low) 30%,transparent)]">
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-[var(--color-success)]" />
                <span className="text-[var(--color-text-primary)]">Your Submissions</span>
              </div>
              <span className="text-[var(--color-text-secondary)] font-medium">
                {offlineStats.submissions}
              </span>
            </div>

            {offlineStats.pendingActions > 0 && (
              <div className="flex items-center justify-between p-3 bg-[color-mix(in srgb,var(--color-warning) 10%,transparent)] rounded-lg border border-[color-mix(in srgb,var(--color-warning) 25%,transparent)]">
                <div className="flex items-center gap-3">
                  <Clock size={20} className="text-[var(--color-warning)]" />
                  <span className="text-[var(--color-text-primary)]">Pending Sync</span>
                </div>
                <span className="text-[var(--color-warning)] font-medium">
                  {offlineStats.pendingActions}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Last Activity */}
        {lastActivity && (
          <div className="mb-8">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Last online: {lastActivity}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleRetry}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--color-accent-blue)] text-black rounded-lg font-medium hover:bg-[color-mix(in srgb,var(--color-accent-blue) 90%,white 10%)] transition-colors"
          >
            <RefreshCw size={20} />
            Check Connection
          </button>

          <button
            onClick={() => window.history.back()}
            className="w-full px-4 py-3 bg-[color-mix(in srgb,var(--color-bg-surface) 80%,transparent)] text-[var(--color-text-primary)] rounded-lg font-medium border border-[color-mix(in srgb,var(--color-divider-low) 30%,transparent)] hover:bg-[color-mix(in srgb,var(--color-bg-surface) 60%,transparent)] transition-colors"
          >
            Go Back
          </button>
        </div>

        {/* Tips */}
        <div className="mt-8 p-4 bg-[color-mix(in srgb,var(--color-accent-teal) 10%,transparent)] rounded-lg border border-[color-mix(in srgb,var(--color-accent-teal) 25%,transparent)]">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-[var(--color-accent-teal)] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
                Offline Tips
              </h3>
              <ul className="text-xs text-[var(--color-text-secondary)] space-y-1">
                <li>• Check your WiFi or cellular connection</li>
                <li>• Try moving to an area with better signal</li>
                <li>• Your progress is saved and will sync automatically</li>
                <li>• You can still review cached tasks and submissions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}