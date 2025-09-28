/**
 * Notifications API - List and manage user notifications
 * GET /api/notifications - List user notifications with pagination and filtering
 * PATCH /api/notifications/[id] - Mark notification as opened/clicked
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserNotifications, getUserNotificationStats, markNotificationOpened } from '@/lib/notifications';
import { executeQuery } from '@/lib/db';
import { NotificationsResponse, ApiResponse, NotificationType } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract user ID from session/auth
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');
    const unreadOnly = searchParams.get('unread_only') === 'true';
    const type = searchParams.get('type') as NotificationType | undefined;
    const includeStats = searchParams.get('include_stats') === 'true';

    // Get user data for personalization
    const userResult = await executeQuery(
      'SELECT username FROM users WHERE id = $1',
      [userId]
    );
    const username = userResult.rows[0]?.username || 'there';

    // Get notifications
    const { notifications: rawNotifications, total } = await getUserNotifications(userId, {
      limit,
      offset,
      unreadOnly,
      type
    });

    // Personalize notifications with actual username
    const notifications = rawNotifications.map(notification => ({
      ...notification,
      title: notification.title.replace(/\${username}/g, username),
      message: notification.message?.replace(/\${username}/g, username) || notification.message
    }));

    // Get stats if requested
    let stats = undefined;
    if (includeStats) {
      stats = await getUserNotificationStats(userId);
    }

    const response: NotificationsResponse = {
      success: true,
      notifications,
      pagination: {
        limit,
        offset,
        count: notifications.length,
        total,
        has_more: offset + limit < total
      },
      stats
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch notifications',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    // Extract user ID from session/auth
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body; // 'opened' or 'clicked'

    // Verify notification belongs to user
    const verificationResult = await executeQuery(
      'SELECT id FROM notifications WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );

    if (verificationResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Notification not found or unauthorized' },
        { status: 404 }
      );
    }

    let notification = null;

    if (action === 'opened') {
      notification = await markNotificationOpened(notificationId);
    } else if (action === 'clicked') {
      // Mark as clicked (which also implies opened)
      notification = await executeQuery(
        `UPDATE notifications
         SET status = 'clicked',
             clicked_at = CURRENT_TIMESTAMP,
             opened_at = COALESCE(opened_at, CURRENT_TIMESTAMP),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [notificationId]
      );
      notification = notification.rows[0];
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use "opened" or "clicked"' },
        { status: 400 }
      );
    }

    if (!notification) {
      return NextResponse.json(
        { success: false, error: 'Failed to update notification' },
        { status: 500 }
      );
    }

    const response: ApiResponse = {
      success: true,
      data: notification,
      message: `Notification marked as ${action}`
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to update notification:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update notification',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');

    // Extract user ID from session/auth
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    if (notificationId) {
      // Delete specific notification
      const result = await executeQuery(
        'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
        [notificationId, userId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Notification not found or unauthorized' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Notification deleted'
      });
    } else {
      // Delete all read notifications for user
      const result = await executeQuery(
        'DELETE FROM notifications WHERE user_id = $1 AND status IN (\'opened\', \'clicked\') RETURNING id',
        [userId]
      );

      return NextResponse.json({
        success: true,
        message: `Deleted ${result.rowCount} read notifications`
      });
    }
  } catch (error) {
    console.error('Failed to delete notification(s):', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete notification(s)',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}