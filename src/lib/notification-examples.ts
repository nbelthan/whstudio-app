/**
 * Notification System Usage Examples
 * This file demonstrates how to use the complete notification system
 */

import { sendNotification, sendBulkNotifications, NotificationHelpers } from '@/lib/notifications';
import { useNotifications } from '@/stores';

// ===== SERVER-SIDE EXAMPLES =====

/**
 * Example 1: Send a high-paying task notification to multiple users
 */
export async function sendHighPayingTaskAlert() {
  const userIds = ['user1', 'user2', 'user3']; // Array of user IDs
  const taskData = {
    task_id: 'task_123',
    title: 'Analyze AI Safety Research Paper',
    amount: 50,
    currency: 'USDC',
    task_type: 'research'
  };

  try {
    const notifications = await NotificationHelpers.sendHighPayingTaskAlert(userIds, taskData);
    console.log(`Sent ${notifications.length} high-paying task alerts`);
    return notifications;
  } catch (error) {
    console.error('Failed to send high-paying task alerts:', error);
  }
}

/**
 * Example 2: Send payment received notification
 */
export async function notifyPaymentReceived(userId: string, paymentData: any) {
  try {
    const notification = await NotificationHelpers.sendPaymentReceived(userId, {
      amount: paymentData.amount,
      currency: paymentData.currency,
      task_title: paymentData.task_title,
      task_id: paymentData.task_id
    });
    console.log('Payment notification sent:', notification.title);
    return notification;
  } catch (error) {
    console.error('Failed to send payment notification:', error);
  }
}

/**
 * Example 3: Send custom notification with full personalization
 */
export async function sendCustomNotification(userId: string) {
  try {
    const notification = await sendNotification(
      'task_assigned',
      userId,
      {
        username: 'Alex', // This will be replaced with actual username in API
        task_title: 'Evaluate LLM Responses for Safety',
        task_id: 'task_456'
      },
      {
        priority: 'high',
        actionUrl: '/tasks/task_456',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        metadata: {
          task_id: 'task_456',
          category: 'ai_safety',
          estimated_time: 30
        }
      }
    );
    return notification;
  } catch (error) {
    console.error('Failed to send custom notification:', error);
  }
}

/**
 * Example 4: Send bulk notifications with different personalization per user
 */
export async function sendBulkTaskCompletionNotifications(userTaskData: Array<{userId: string, taskTitle: string, amount: number}>) {
  const userIds = userTaskData.map(data => data.userId);

  // Create a mapping for personalization data
  const userDataMap = new Map(
    userTaskData.map(data => [data.userId, data])
  );

  try {
    const notifications = await sendBulkNotifications(
      'task_completed',
      userIds,
      (userId) => {
        const userData = userDataMap.get(userId);
        return {
          username: 'there', // Will be replaced with actual username
          task_title: userData?.taskTitle || 'Unknown Task',
          amount: userData?.amount || 0,
          currency: 'USDC'
        };
      },
      {
        priority: 'medium',
        metadata: { batch_id: Date.now().toString() }
      }
    );

    console.log(`Sent ${notifications.length} task completion notifications`);
    return notifications;
  } catch (error) {
    console.error('Failed to send bulk notifications:', error);
  }
}

// ===== CLIENT-SIDE EXAMPLES =====

/**
 * Example 5: React component using notification store
 */
export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    markAsOpened,
    markAsClicked,
    clearNotifications
  } = useNotifications();

  const handleNotificationClick = async (notification: any) => {
    // Mark as clicked (which also marks as opened)
    markAsClicked(notification.id);

    // Navigate to action URL if available
    if (notification.action_url) {
      // Use your router here, e.g., router.push(notification.action_url)
      console.log('Navigate to:', notification.action_url);
    }

    // Also call API to update server state
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'current-user-id'
        },
        body: JSON.stringify({ action: 'clicked' }),
        url: `/api/notifications?id=${notification.id}`
      });
    } catch (error) {
      console.error('Failed to update notification on server:', error);
    }
  };

  const handleMarkAllRead = async () => {
    markAllAsRead();

    // Also update server
    try {
      const unreadNotifications = notifications.filter(n =>
        n.status === 'sent' || n.status === 'delivered'
      );

      for (const notification of unreadNotifications) {
        await fetch(`/api/notifications?id=${notification.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': 'current-user-id'
          },
          body: JSON.stringify({ action: 'opened' })
        });
      }
    } catch (error) {
      console.error('Failed to mark all as read on server:', error);
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell Icon */}
      <button className="relative p-2">
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      <div className="absolute right-0 mt-2 w-80 bg-white shadow-lg rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No notifications</p>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  notification.status === 'sent' || notification.status === 'delivered'
                    ? 'bg-blue-50 border-l-4 border-blue-500'
                    : 'bg-gray-50'
                }`}
              >
                <div className="font-medium text-sm">{notification.title}</div>
                {notification.message && (
                  <div className="text-sm text-gray-600 mt-1">{notification.message}</div>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(notification.created_at).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>

        {notifications.length > 0 && (
          <button
            onClick={clearNotifications}
            className="w-full mt-4 text-sm text-red-600 hover:text-red-800"
          >
            Clear all notifications
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Example 6: Fetch and load notifications in React
 */
export function useNotificationLoader() {
  const {
    setNotifications,
    setStats,
    setNotificationLoading,
    setNotificationError
  } = useNotifications();

  const loadNotifications = async (options: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    includeStats?: boolean;
  } = {}) => {
    setNotificationLoading('fetch', true);

    try {
      const params = new URLSearchParams();
      if (options.limit) params.set('limit', options.limit.toString());
      if (options.offset) params.set('offset', options.offset.toString());
      if (options.unreadOnly) params.set('unread_only', 'true');
      if (options.includeStats) params.set('include_stats', 'true');

      const response = await fetch(`/api/notifications?${params}`, {
        headers: {
          'x-user-id': 'current-user-id' // Replace with actual user ID
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();

      if (data.success) {
        setNotifications(data.notifications);
        if (data.stats) {
          setStats(data.stats);
        }
        setNotificationError('fetch', null);
      } else {
        throw new Error(data.error || 'Failed to fetch notifications');
      }
    } catch (error) {
      setNotificationError('fetch', error instanceof Error ? error.message : 'Unknown error');
      console.error('Failed to load notifications:', error);
    } finally {
      setNotificationLoading('fetch', false);
    }
  };

  return { loadNotifications };
}

// ===== API ENDPOINT EXAMPLES =====

/**
 * Example 7: API endpoint to trigger notifications (in your task completion handler)
 */
export async function handleTaskCompletion(taskId: string, userId: string, submissionData: any) {
  // ... task completion logic ...

  // Send notification
  try {
    await fetch('/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'system',
        'x-system-request': 'true' // Indicates this is a system request
      },
      body: JSON.stringify({
        user_id: userId,
        type: 'task_completed',
        personalization_data: {
          task_title: submissionData.task_title,
          task_id: taskId
        },
        priority: 'medium',
        metadata: {
          task_id: taskId,
          submission_id: submissionData.id
        }
      })
    });
  } catch (error) {
    console.error('Failed to send task completion notification:', error);
  }
}

/**
 * Example 8: Scheduled function to send streak milestone notifications
 */
export async function checkAndSendStreakMilestones() {
  // This would typically be called by a cron job or scheduled function

  try {
    // Get users with streak milestones (pseudo-code)
    const usersWithMilestones = await getUsersWithStreakMilestones();

    for (const user of usersWithMilestones) {
      if ([7, 14, 30, 60, 100].includes(user.streak_count)) {
        await fetch('/api/notifications/send', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': 'system',
            'x-system-request': 'true'
          },
          body: JSON.stringify({
            user_id: user.id,
            streak_count: user.streak_count
          }),
          url: '/api/notifications/send?preset=streak_milestone'
        });
      }
    }
  } catch (error) {
    console.error('Failed to send streak milestone notifications:', error);
  }
}

// Mock function for example
async function getUsersWithStreakMilestones(): Promise<Array<{id: string, streak_count: number}>> {
  // This would query your database for users with current streaks
  return [];
}

// ===== NOTIFICATION STATISTICS EXAMPLES =====

/**
 * Example 9: Getting notification performance metrics
 */
export async function getNotificationMetrics(userId: string) {
  try {
    const response = await fetch('/api/notifications?include_stats=true', {
      headers: {
        'x-user-id': userId
      }
    });

    const data = await response.json();

    if (data.success && data.stats) {
      console.log('Open rate:', data.stats.open_rate + '%');
      console.log('Click rate:', data.stats.click_rate + '%');
      console.log('Best performing type:',
        data.stats.by_type.sort((a, b) => b.open_rate - a.open_rate)[0]?.type
      );

      return data.stats;
    }
  } catch (error) {
    console.error('Failed to get notification metrics:', error);
  }
}

export default {
  sendHighPayingTaskAlert,
  notifyPaymentReceived,
  sendCustomNotification,
  sendBulkTaskCompletionNotifications,
  NotificationBell,
  useNotificationLoader,
  handleTaskCompletion,
  checkAndSendStreakMilestones,
  getNotificationMetrics
};