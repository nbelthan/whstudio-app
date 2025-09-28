/**
 * Notification Service for WorldHuman Studio
 * Handles sending, personalizing, and tracking notifications
 */

import {
  NotificationType,
  NotificationTemplate,
  Notification,
  NotificationPriority,
  SendNotificationRequest,
  NotificationStats
} from '@/types';
import { executeQuery, insertRecord, updateRecord, findMany } from '@/lib/db';
import { randomUUID } from 'crypto';

// Predefined notification templates with emojis and personalization
export const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  task_available: {
    id: 'task_available',
    type: 'task_available',
    title_template: '🎯 ${username}, new task available!',
    message_template: 'A new ${task_type} task is waiting for you. Earn ${amount} ${currency}.',
    action_url: '/tasks/${task_id}',
    emoji: '🎯',
    priority: 'medium',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  task_assigned: {
    id: 'task_assigned',
    type: 'task_assigned',
    title_template: '✅ ${username}, task assigned to you!',
    message_template: 'You\'ve been assigned: "${task_title}". Get started now!',
    action_url: '/tasks/${task_id}',
    emoji: '✅',
    priority: 'high',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  task_completed: {
    id: 'task_completed',
    type: 'task_completed',
    title_template: '🎉 ${username}, task completed!',
    message_template: 'Great job! You\'ve completed "${task_title}". Payment is being processed.',
    action_url: '/submissions',
    emoji: '🎉',
    priority: 'medium',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  payment_received: {
    id: 'payment_received',
    type: 'payment_received',
    title_template: '💰 ${username}, payment received!',
    message_template: 'You\'ve earned ${amount} ${currency} for completing "${task_title}"!',
    action_url: '/payments',
    emoji: '💰',
    priority: 'high',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  submission_reviewed: {
    id: 'submission_reviewed',
    type: 'submission_reviewed',
    title_template: '📋 ${username}, submission reviewed',
    message_template: 'Your submission for "${task_title}" has been ${status}.',
    action_url: '/submissions/${submission_id}',
    emoji: '📋',
    priority: 'medium',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  high_paying_task: {
    id: 'high_paying_task',
    type: 'high_paying_task',
    title_template: '🔥 ${username}, high-paying task available!',
    message_template: 'Premium task alert! Earn ${amount} ${currency} for ${task_type}. Limited spots!',
    action_url: '/tasks/${task_id}',
    emoji: '🔥',
    priority: 'urgent',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  streak_milestone: {
    id: 'streak_milestone',
    type: 'streak_milestone',
    title_template: '⚡ ${username}, ${streak_count}-day streak!',
    message_template: 'Amazing! You\'re on a ${streak_count}-day streak. Keep it up for bonus rewards!',
    action_url: '/dashboard',
    emoji: '⚡',
    priority: 'medium',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  reputation_updated: {
    id: 'reputation_updated',
    type: 'reputation_updated',
    title_template: '⭐ ${username}, reputation updated!',
    message_template: 'Your reputation score is now ${reputation_score}. Great work!',
    action_url: '/dashboard',
    emoji: '⭐',
    priority: 'low',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  urgent_task: {
    id: 'urgent_task',
    type: 'urgent_task',
    title_template: '🚨 ${username}, urgent task needs attention!',
    message_template: 'Time-sensitive ${task_type} task expires soon. Earn ${amount} ${currency}!',
    action_url: '/tasks/${task_id}',
    emoji: '🚨',
    priority: 'urgent',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  consensus_needed: {
    id: 'consensus_needed',
    type: 'consensus_needed',
    title_template: '🤝 ${username}, consensus review needed',
    message_template: 'Help review submissions for "${task_title}". Your expertise is needed!',
    action_url: '/tasks/${task_id}/consensus',
    emoji: '🤝',
    priority: 'medium',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  weekly_summary: {
    id: 'weekly_summary',
    type: 'weekly_summary',
    title_template: '📊 ${username}, your weekly summary',
    message_template: 'This week: ${tasks_completed} tasks completed, ${amount} ${currency} earned!',
    action_url: '/dashboard',
    emoji: '📊',
    priority: 'low',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },

  achievement_unlocked: {
    id: 'achievement_unlocked',
    type: 'achievement_unlocked',
    title_template: '🏆 ${username}, achievement unlocked!',
    message_template: 'Congratulations! You\'ve unlocked "${achievement_name}". Keep up the great work!',
    action_url: '/achievements',
    emoji: '🏆',
    priority: 'medium',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
};

/**
 * Personalizes a template string with provided data
 */
function personalizeTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/\${(\w+)}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : match;
  });
}

/**
 * Creates a personalized notification from a template
 */
export function createPersonalizedNotification(
  type: NotificationType,
  userId: string,
  personalizationData: Record<string, any>,
  options: {
    priority?: NotificationPriority;
    actionUrl?: string;
    expiresAt?: string;
    metadata?: Record<string, any>;
  } = {}
): Omit<Notification, 'id' | 'created_at' | 'updated_at'> {
  const template = NOTIFICATION_TEMPLATES[type];

  if (!template || !template.is_active) {
    throw new Error(`Notification template for type "${type}" not found or inactive`);
  }

  const personalizedTitle = personalizeTemplate(template.title_template, personalizationData);
  const personalizedMessage = template.message_template
    ? personalizeTemplate(template.message_template, personalizationData)
    : undefined;

  const personalizedActionUrl = options.actionUrl || (template.action_url
    ? personalizeTemplate(template.action_url, personalizationData)
    : undefined);

  return {
    user_id: userId,
    type,
    title: personalizedTitle,
    message: personalizedMessage,
    action_url: personalizedActionUrl,
    priority: options.priority || template.priority,
    status: 'sent',
    metadata: options.metadata,
    personalization_data: personalizationData,
    sent_at: new Date().toISOString(),
    expires_at: options.expiresAt
  };
}

/**
 * Send a notification to a single user
 */
export async function sendNotification(
  type: NotificationType,
  userId: string,
  personalizationData: Record<string, any> = {},
  options: {
    priority?: NotificationPriority;
    actionUrl?: string;
    expiresAt?: string;
    metadata?: Record<string, any>;
  } = {}
): Promise<Notification> {
  try {
    // Create personalized notification
    const notificationData = createPersonalizedNotification(
      type,
      userId,
      personalizationData,
      options
    );

    // Save to database
    const notification = await insertRecord<Notification>('notifications', {
      id: randomUUID(),
      ...notificationData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    console.log(`Notification sent to user ${userId}:`, notification.title);
    return notification;
  } catch (error) {
    console.error('Failed to send notification:', error);
    throw new Error(`Failed to send notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Send notifications to multiple users
 */
export async function sendBulkNotifications(
  type: NotificationType,
  userIds: string[],
  personalizationDataFn: (userId: string) => Record<string, any>,
  options: {
    priority?: NotificationPriority;
    actionUrl?: string;
    expiresAt?: string;
    metadata?: Record<string, any>;
  } = {}
): Promise<Notification[]> {
  const notifications: Notification[] = [];

  for (const userId of userIds) {
    try {
      const personalizationData = personalizationDataFn(userId);
      const notification = await sendNotification(type, userId, personalizationData, options);
      notifications.push(notification);
    } catch (error) {
      console.error(`Failed to send notification to user ${userId}:`, error);
      // Continue with other users even if one fails
    }
  }

  console.log(`Sent ${notifications.length}/${userIds.length} notifications`);
  return notifications;
}

/**
 * Mark a notification as opened
 */
export async function markNotificationOpened(notificationId: string): Promise<Notification | null> {
  try {
    const notification = await updateRecord<Notification>('notifications', notificationId, {
      status: 'opened',
      opened_at: new Date().toISOString()
    });

    return notification;
  } catch (error) {
    console.error('Failed to mark notification as opened:', error);
    return null;
  }
}

/**
 * Mark a notification as clicked
 */
export async function markNotificationClicked(notificationId: string): Promise<Notification | null> {
  try {
    const notification = await updateRecord<Notification>('notifications', notificationId, {
      status: 'clicked',
      clicked_at: new Date().toISOString()
    });

    return notification;
  } catch (error) {
    console.error('Failed to mark notification as clicked:', error);
    return null;
  }
}

/**
 * Get user notifications with pagination
 */
export async function getUserNotifications(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    type?: NotificationType;
  } = {}
): Promise<{ notifications: Notification[]; total: number }> {
  const { limit = 20, offset = 0, unreadOnly = false, type } = options;

  let whereConditions = ['user_id = $1'];
  let params: any[] = [userId];
  let paramIndex = 2;

  if (unreadOnly) {
    whereConditions.push(`status IN ('sent', 'delivered')`);
  }

  if (type) {
    whereConditions.push(`type = $${paramIndex}`);
    params.push(type);
    paramIndex++;
  }

  // Add expiration check
  whereConditions.push(`(expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`);

  const whereClause = whereConditions.join(' AND ');

  const result = await findMany<Notification>('notifications', {
    where: whereClause,
    whereParams: params,
    orderBy: 'created_at DESC',
    limit,
    offset
  });

  return result;
}

/**
 * Get notification statistics for a user
 */
export async function getUserNotificationStats(userId: string): Promise<NotificationStats> {
  try {
    // Get overall stats
    const overallResult = await executeQuery<{
      total_sent: string;
      total_delivered: string;
      total_opened: string;
      total_clicked: string;
    }>(`
      SELECT
        COUNT(*) as total_sent,
        COUNT(CASE WHEN status IN ('delivered', 'opened', 'clicked') THEN 1 END) as total_delivered,
        COUNT(CASE WHEN status IN ('opened', 'clicked') THEN 1 END) as total_opened,
        COUNT(CASE WHEN status = 'clicked' THEN 1 END) as total_clicked
      FROM notifications
      WHERE user_id = $1
    `, [userId]);

    const overall = overallResult.rows[0];
    const totalSent = parseInt(overall?.total_sent || '0');
    const totalDelivered = parseInt(overall?.total_delivered || '0');
    const totalOpened = parseInt(overall?.total_opened || '0');
    const totalClicked = parseInt(overall?.total_clicked || '0');

    const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
    const clickRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;

    // Get stats by type
    const byTypeResult = await executeQuery<{
      type: NotificationType;
      sent: string;
      opened: string;
    }>(`
      SELECT
        type,
        COUNT(*) as sent,
        COUNT(CASE WHEN status IN ('opened', 'clicked') THEN 1 END) as opened
      FROM notifications
      WHERE user_id = $1
      GROUP BY type
      ORDER BY sent DESC
    `, [userId]);

    const byType = byTypeResult.rows.map(row => ({
      type: row.type,
      sent: parseInt(row.sent),
      opened: parseInt(row.opened),
      open_rate: parseInt(row.sent) > 0 ? (parseInt(row.opened) / parseInt(row.sent)) * 100 : 0
    }));

    return {
      total_sent: totalSent,
      total_delivered: totalDelivered,
      total_opened: totalOpened,
      total_clicked: totalClicked,
      open_rate: Math.round(openRate * 100) / 100,
      click_rate: Math.round(clickRate * 100) / 100,
      by_type: byType
    };
  } catch (error) {
    console.error('Failed to get notification stats:', error);
    return {
      total_sent: 0,
      total_delivered: 0,
      total_opened: 0,
      total_clicked: 0,
      open_rate: 0,
      click_rate: 0,
      by_type: []
    };
  }
}

/**
 * Clean up expired notifications
 */
export async function cleanupExpiredNotifications(): Promise<number> {
  try {
    const result = await executeQuery(`
      DELETE FROM notifications
      WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP
    `);

    console.log(`Cleaned up ${result.rowCount} expired notifications`);
    return result.rowCount;
  } catch (error) {
    console.error('Failed to cleanup expired notifications:', error);
    return 0;
  }
}

/**
 * Helper functions for common notification scenarios
 */
export const NotificationHelpers = {
  /**
   * Send a high-paying task notification
   */
  async sendHighPayingTaskAlert(
    userIds: string[],
    taskData: {
      task_id: string;
      title: string;
      amount: number;
      currency: string;
      task_type: string;
    }
  ) {
    return await sendBulkNotifications(
      'high_paying_task',
      userIds,
      (userId) => ({
        username: 'there', // Will be replaced with actual username in API
        task_id: taskData.task_id,
        task_title: taskData.title,
        amount: taskData.amount,
        currency: taskData.currency,
        task_type: taskData.task_type
      }),
      {
        priority: 'urgent',
        metadata: { task_id: taskData.task_id },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      }
    );
  },

  /**
   * Send payment received notification
   */
  async sendPaymentReceived(
    userId: string,
    paymentData: {
      amount: number;
      currency: string;
      task_title: string;
      task_id: string;
    }
  ) {
    return await sendNotification(
      'payment_received',
      userId,
      {
        username: 'there', // Will be replaced with actual username in API
        amount: paymentData.amount,
        currency: paymentData.currency,
        task_title: paymentData.task_title
      },
      {
        priority: 'high',
        metadata: {
          task_id: paymentData.task_id,
          amount: paymentData.amount,
          currency: paymentData.currency
        }
      }
    );
  },

  /**
   * Send streak milestone notification
   */
  async sendStreakMilestone(
    userId: string,
    streakCount: number
  ) {
    return await sendNotification(
      'streak_milestone',
      userId,
      {
        username: 'there', // Will be replaced with actual username in API
        streak_count: streakCount
      },
      {
        priority: 'medium',
        metadata: { streak_count: streakCount }
      }
    );
  }
};

export default {
  NOTIFICATION_TEMPLATES,
  createPersonalizedNotification,
  sendNotification,
  sendBulkNotifications,
  markNotificationOpened,
  markNotificationClicked,
  getUserNotifications,
  getUserNotificationStats,
  cleanupExpiredNotifications,
  NotificationHelpers
};