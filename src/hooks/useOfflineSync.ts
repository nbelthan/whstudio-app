'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { api } from '@/lib/api';
import offlineStorage, { QueuedAction } from '@/lib/offlineStorage';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingActions: number;
  syncErrors: Array<{ action: string; error: string; timestamp: number }>;
  syncProgress: number;
}

export interface SyncOptions {
  enableAutoSync: boolean;
  syncInterval: number;
  maxRetries: number;
  batchSize: number;
}

/**
 * Hook for managing offline synchronization
 */
export function useOfflineSync() {
  const { isOnline, refreshNetworkStatus } = useNetworkStatus();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline,
    isSyncing: false,
    lastSyncTime: null,
    pendingActions: 0,
    syncErrors: [],
    syncProgress: 0,
  });

  const [syncOptions, setSyncOptions] = useState<SyncOptions>({
    enableAutoSync: true,
    syncInterval: 30000, // 30 seconds
    maxRetries: 3,
    batchSize: 5,
  });

  const syncIntervalRef = useRef<NodeJS.Timeout>();
  const isSyncingRef = useRef(false);

  /**
   * Queue an action for offline execution
   */
  const queueAction = useCallback(async (
    type: QueuedAction['type'],
    data: any,
    url?: string,
    method?: string
  ): Promise<string> => {
    const actionId = await offlineStorage.queue.enqueue({
      type,
      data,
      url,
      method,
      maxRetries: syncOptions.maxRetries,
    });

    // Update pending count
    const allActions = await offlineStorage.queue.getAll();
    setSyncStatus(prev => ({
      ...prev,
      pendingActions: allActions.length,
    }));

    // Trigger sync if online
    if (isOnline && syncOptions.enableAutoSync) {
      setTimeout(performSync, 1000);
    }

    return actionId;
  }, [isOnline, syncOptions]);

  /**
   * Perform synchronization of queued actions
   */
  const performSync = useCallback(async (): Promise<void> => {
    if (isSyncingRef.current || !isOnline) {
      return;
    }

    isSyncingRef.current = true;
    setSyncStatus(prev => ({ ...prev, isSyncing: true, syncProgress: 0 }));

    try {
      const retryableActions = await offlineStorage.queue.getRetryable();
      const totalActions = retryableActions.length;

      if (totalActions === 0) {
        setSyncStatus(prev => ({
          ...prev,
          isSyncing: false,
          syncProgress: 100,
          lastSyncTime: Date.now(),
        }));
        return;
      }

      let processedActions = 0;
      const errors: Array<{ action: string; error: string; timestamp: number }> = [];

      // Process actions in batches
      for (let i = 0; i < retryableActions.length; i += syncOptions.batchSize) {
        const batch = retryableActions.slice(i, i + syncOptions.batchSize);

        await Promise.allSettled(
          batch.map(async (action) => {
            try {
              await processAction(action);
              await offlineStorage.queue.dequeue(action.id);
              processedActions++;
            } catch (error) {
              console.error('Failed to process action:', action, error);

              // Increment retry count
              await offlineStorage.queue.incrementRetry(action.id);

              // Remove action if max retries exceeded
              if (action.retryCount >= action.maxRetries) {
                await offlineStorage.queue.dequeue(action.id);
                errors.push({
                  action: `${action.type}: ${action.url || 'Unknown'}`,
                  error: error instanceof Error ? error.message : String(error),
                  timestamp: Date.now(),
                });
              }
            }
          })
        );

        // Update progress
        const progress = Math.round((processedActions / totalActions) * 100);
        setSyncStatus(prev => ({ ...prev, syncProgress: progress }));

        // Small delay between batches to avoid overwhelming the server
        if (i + syncOptions.batchSize < retryableActions.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Update final status
      const remainingActions = await offlineStorage.queue.getAll();
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        syncProgress: 100,
        lastSyncTime: Date.now(),
        pendingActions: remainingActions.length,
        syncErrors: [...prev.syncErrors.slice(-10), ...errors].slice(-20), // Keep last 20 errors
      }));

    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        syncErrors: [...prev.syncErrors, {
          action: 'Sync process',
          error: error instanceof Error ? error.message : String(error),
          timestamp: Date.now(),
        }].slice(-20),
      }));
    } finally {
      isSyncingRef.current = false;
    }
  }, [isOnline, syncOptions]);

  /**
   * Process individual queued action
   */
  const processAction = async (action: QueuedAction): Promise<void> => {
    switch (action.type) {
      case 'submit_task':
        await handleTaskSubmission(action);
        break;
      case 'update_profile':
        await handleProfileUpdate(action);
        break;
      case 'payment_request':
        await handlePaymentRequest(action);
        break;
      case 'api_call':
        await handleApiCall(action);
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  };

  /**
   * Handle task submission sync
   */
  const handleTaskSubmission = async (action: QueuedAction): Promise<void> => {
    const { taskId, submission } = action.data;

    const response = await api.post(`/api/tasks/${taskId}/submit`, submission, {
      timeout: 15000,
      retries: 2,
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to submit task');
    }

    // Update local storage with successful submission
    await offlineStorage.submissions.updateSubmissionSyncStatus(submission.id, 'synced');
  };

  /**
   * Handle profile update sync
   */
  const handleProfileUpdate = async (action: QueuedAction): Promise<void> => {
    const response = await api.put('/api/auth/profile', action.data, {
      timeout: 10000,
      retries: 2,
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to update profile');
    }
  };

  /**
   * Handle payment request sync
   */
  const handlePaymentRequest = async (action: QueuedAction): Promise<void> => {
    const response = await api.post('/api/payments', action.data, {
      timeout: 20000,
      retries: 1, // Payment requests should have fewer retries
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to process payment');
    }
  };

  /**
   * Handle generic API call sync
   */
  const handleApiCall = async (action: QueuedAction): Promise<void> => {
    if (!action.url || !action.method) {
      throw new Error('Invalid API call action: missing URL or method');
    }

    const response = await api.get(action.url, {
      method: action.method as any,
      timeout: 15000,
      retries: 2,
    });

    if (!response.success) {
      throw new Error(response.error || 'API call failed');
    }
  };

  /**
   * Force immediate sync
   */
  const forceSync = useCallback(async (): Promise<void> => {
    if (!isOnline) {
      throw new Error('Cannot sync while offline');
    }

    await performSync();
  }, [isOnline, performSync]);

  /**
   * Clear sync errors
   */
  const clearSyncErrors = useCallback((): void => {
    setSyncStatus(prev => ({ ...prev, syncErrors: [] }));
  }, []);

  /**
   * Update sync options
   */
  const updateSyncOptions = useCallback((newOptions: Partial<SyncOptions>): void => {
    setSyncOptions(prev => ({ ...prev, ...newOptions }));

    // Save to localStorage
    try {
      const options = { ...syncOptions, ...newOptions };
      localStorage.setItem('whstudio-sync-options', JSON.stringify(options));
    } catch (error) {
      console.warn('Failed to save sync options:', error);
    }
  }, [syncOptions]);

  /**
   * Get sync statistics
   */
  const getSyncStats = useCallback(async () => {
    const allActions = await offlineStorage.queue.getAll();
    const retryableActions = await offlineStorage.queue.getRetryable();
    const failedActions = allActions.filter(action => action.retryCount >= action.maxRetries);

    return {
      total: allActions.length,
      pending: retryableActions.length,
      failed: failedActions.length,
      lastSync: syncStatus.lastSyncTime,
      errors: syncStatus.syncErrors.length,
    };
  }, [syncStatus]);

  /**
   * Queue task submission for offline sync
   */
  const queueTaskSubmission = useCallback(async (taskId: string, submission: any): Promise<string> => {
    // Save submission to local storage first
    await offlineStorage.submissions.saveSubmission({
      ...submission,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      task_id: taskId,
    });

    return queueAction('submit_task', { taskId, submission });
  }, [queueAction]);

  /**
   * Queue profile update for offline sync
   */
  const queueProfileUpdate = useCallback(async (profileData: any): Promise<string> => {
    return queueAction('update_profile', profileData, '/api/auth/profile', 'PUT');
  }, [queueAction]);

  /**
   * Queue payment request for offline sync
   */
  const queuePaymentRequest = useCallback(async (paymentData: any): Promise<string> => {
    return queueAction('payment_request', paymentData, '/api/payments', 'POST');
  }, [queueAction]);

  // Update online status
  useEffect(() => {
    setSyncStatus(prev => ({ ...prev, isOnline }));
  }, [isOnline]);

  // Load saved sync options
  useEffect(() => {
    try {
      const saved = localStorage.getItem('whstudio-sync-options');
      if (saved) {
        const options = JSON.parse(saved);
        setSyncOptions(prev => ({ ...prev, ...options }));
      }
    } catch (error) {
      console.warn('Failed to load sync options:', error);
    }
  }, []);

  // Set up automatic sync interval
  useEffect(() => {
    if (syncOptions.enableAutoSync && isOnline) {
      syncIntervalRef.current = setInterval(() => {
        if (!isSyncingRef.current) {
          performSync();
        }
      }, syncOptions.syncInterval);
    } else {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = undefined;
      }
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [syncOptions.enableAutoSync, syncOptions.syncInterval, isOnline, performSync]);

  // Perform initial sync when coming back online
  useEffect(() => {
    if (isOnline && syncOptions.enableAutoSync) {
      // Wait a bit for network to stabilize
      const timer = setTimeout(() => {
        performSync();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isOnline, syncOptions.enableAutoSync, performSync]);

  // Update pending actions count on mount
  useEffect(() => {
    const updatePendingCount = async () => {
      const actions = await offlineStorage.queue.getAll();
      setSyncStatus(prev => ({ ...prev, pendingActions: actions.length }));
    };

    updatePendingCount();
  }, []);

  return {
    syncStatus,
    syncOptions,
    updateSyncOptions,
    forceSync,
    clearSyncErrors,
    getSyncStats,
    queueTaskSubmission,
    queueProfileUpdate,
    queuePaymentRequest,
    queueAction,
  };
}

export default useOfflineSync;