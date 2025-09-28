/**
 * React Hook for Notification System Integration
 * Provides easy access to notification functionality with API integration
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useNotifications } from '@/stores';
import { Notification, NotificationType, NotificationStats } from '@/types';

interface UseNotificationSystemOptions {
  userId?: string;
  autoLoad?: boolean;
  pollInterval?: number; // in milliseconds
}

interface UseNotificationSystemReturn {
  // Data
  notifications: Notification[];
  unreadCount: number;
  stats: NotificationStats | null;
  loading: boolean;
  error: string | null;

  // Actions
  loadNotifications: (options?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    type?: NotificationType;
  }) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAsClicked: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAllRead: () => Promise<void>;
  refreshStats: () => Promise<void>;

  // Computed values
  unreadNotifications: Notification[];
  readNotifications: Notification[];
  notificationsByType: Record<NotificationType, Notification[]>;
  hasHighPriorityUnread: boolean;
}

export function useNotificationSystem(
  options: UseNotificationSystemOptions = {}
): UseNotificationSystemReturn {
  const {
    userId,
    autoLoad = true,
    pollInterval = 0 // 0 means no polling
  } = options;

  const {
    notifications,
    unreadCount,
    stats,
    loading,
    errors,
    setNotifications,
    updateNotification,
    removeNotification,
    markAsOpened,
    markAsClicked,
    markAllAsRead,
    setStats,
    setNotificationLoading,
    setNotificationError
  } = useNotifications();

  const isLoading = loading['notification_fetch'] || false;
  const error = errors['notification_fetch'] || null;

  // API request helper
  const makeRequest = useCallback(async (
    endpoint: string,
    options: RequestInit = {}
  ) => {
    if (!userId) {
      throw new Error('User ID is required for notification operations');
    }

    const response = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    return response.json();
  }, [userId]);

  // Load notifications from API
  const loadNotifications = useCallback(async (loadOptions: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    type?: NotificationType;
  } = {}) => {
    setNotificationLoading('fetch', true);
    setNotificationError('fetch', null);

    try {
      const params = new URLSearchParams();
      if (loadOptions.limit) params.set('limit', loadOptions.limit.toString());
      if (loadOptions.offset) params.set('offset', loadOptions.offset.toString());
      if (loadOptions.unreadOnly) params.set('unread_only', 'true');
      if (loadOptions.type) params.set('type', loadOptions.type);
      params.set('include_stats', 'true');

      const data = await makeRequest(`/api/notifications?${params}`);

      if (data.success) {
        setNotifications(data.notifications);
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        throw new Error(data.error || 'Failed to load notifications');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load notifications';
      setNotificationError('fetch', errorMessage);
      console.error('Failed to load notifications:', error);
    } finally {
      setNotificationLoading('fetch', false);
    }
  }, [makeRequest, setNotifications, setStats, setNotificationLoading, setNotificationError]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const data = await makeRequest(`/api/notifications?id=${notificationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'opened' })
      });

      if (data.success) {
        markAsOpened(notificationId);
      } else {
        throw new Error(data.error || 'Failed to mark as read');
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }, [makeRequest, markAsOpened]);

  // Mark notification as clicked
  const markAsClickedAndNavigate = useCallback(async (notificationId: string) => {
    try {
      const data = await makeRequest(`/api/notifications?id=${notificationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'clicked' })
      });

      if (data.success) {
        markAsClicked(notificationId);
      } else {
        throw new Error(data.error || 'Failed to mark as clicked');
      }
    } catch (error) {
      console.error('Failed to mark notification as clicked:', error);
      throw error;
    }
  }, [makeRequest, markAsClicked]);

  // Mark all notifications as read
  const markAllAsReadAndSync = useCallback(async () => {
    try {
      // Get unread notifications
      const unreadNotifications = notifications.filter(n =>
        n.status === 'sent' || n.status === 'delivered'
      );

      // Mark all as read locally first for immediate UI feedback
      markAllAsRead();

      // Sync with server
      await Promise.all(
        unreadNotifications.map(notification =>
          makeRequest(`/api/notifications?id=${notification.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ action: 'opened' })
          }).catch(error => {
            console.error(`Failed to mark notification ${notification.id} as read:`, error);
          })
        )
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      // Reload notifications to sync state
      loadNotifications();
    }
  }, [notifications, markAllAsRead, makeRequest, loadNotifications]);

  // Delete a notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const data = await makeRequest(`/api/notifications?id=${notificationId}`, {
        method: 'DELETE'
      });

      if (data.success) {
        removeNotification(notificationId);
      } else {
        throw new Error(data.error || 'Failed to delete notification');
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw error;
    }
  }, [makeRequest, removeNotification]);

  // Clear all read notifications
  const clearAllRead = useCallback(async () => {
    try {
      const data = await makeRequest('/api/notifications', {
        method: 'DELETE'
      });

      if (data.success) {
        // Remove read notifications from local state
        const unreadNotifications = notifications.filter(n =>
          n.status === 'sent' || n.status === 'delivered'
        );
        setNotifications(unreadNotifications);
      } else {
        throw new Error(data.error || 'Failed to clear read notifications');
      }
    } catch (error) {
      console.error('Failed to clear read notifications:', error);
      throw error;
    }
  }, [makeRequest, notifications, setNotifications]);

  // Refresh stats
  const refreshStats = useCallback(async () => {
    try {
      const data = await makeRequest('/api/notifications?include_stats=true&limit=0');
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to refresh notification stats:', error);
    }
  }, [makeRequest, setStats]);

  // Computed values
  const unreadNotifications = useMemo(() =>
    notifications.filter(n => n.status === 'sent' || n.status === 'delivered'),
    [notifications]
  );

  const readNotifications = useMemo(() =>
    notifications.filter(n => n.status === 'opened' || n.status === 'clicked'),
    [notifications]
  );

  const notificationsByType = useMemo(() => {
    const grouped: Record<string, Notification[]> = {};
    notifications.forEach(notification => {
      if (!grouped[notification.type]) {
        grouped[notification.type] = [];
      }
      grouped[notification.type].push(notification);
    });
    return grouped as Record<NotificationType, Notification[]>;
  }, [notifications]);

  const hasHighPriorityUnread = useMemo(() =>
    unreadNotifications.some(n => n.priority === 'urgent' || n.priority === 'high'),
    [unreadNotifications]
  );

  // Auto-load notifications on mount
  useEffect(() => {
    if (autoLoad && userId) {
      loadNotifications();
    }
  }, [autoLoad, userId, loadNotifications]);

  // Polling for new notifications
  useEffect(() => {
    if (pollInterval > 0 && userId) {
      const interval = setInterval(() => {
        loadNotifications({ limit: 5, unreadOnly: true });
      }, pollInterval);

      return () => clearInterval(interval);
    }
  }, [pollInterval, userId, loadNotifications]);

  return {
    // Data
    notifications,
    unreadCount,
    stats,
    loading: isLoading,
    error,

    // Actions
    loadNotifications,
    markAsRead,
    markAsClicked: markAsClickedAndNavigate,
    markAllAsRead: markAllAsReadAndSync,
    deleteNotification,
    clearAllRead,
    refreshStats,

    // Computed values
    unreadNotifications,
    readNotifications,
    notificationsByType,
    hasHighPriorityUnread
  };
}

export default useNotificationSystem;