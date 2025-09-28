/**
 * Send Notifications API
 * POST /api/notifications/send - Send notifications to users
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendNotification, sendBulkNotifications } from '@/lib/notifications';
import { executeQuery } from '@/lib/db';
import { SendNotificationRequest, NotificationResponse, ApiResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    // Check if user has permission to send notifications (admin/system only)
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Only allow admin users or system processes to send notifications
    if (userRole !== 'admin' && !request.headers.get('x-system-request')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to send notifications' },
        { status: 403 }
      );
    }

    const body: SendNotificationRequest = await request.json();
    const {
      user_id,
      user_ids,
      type,
      personalization_data = {},
      priority,
      action_url,
      expires_at,
      metadata
    } = body;

    // Validate request
    if (!type) {
      return NextResponse.json(
        { success: false, error: 'Notification type is required' },
        { status: 400 }
      );
    }

    if (!user_id && (!user_ids || user_ids.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'Either user_id or user_ids must be provided' },
        { status: 400 }
      );
    }

    const options = {
      priority,
      actionUrl: action_url,
      expiresAt: expires_at,
      metadata
    };

    if (user_id) {
      // Send to single user

      // Get user data for personalization
      const userResult = await executeQuery(
        'SELECT username FROM users WHERE id = $1',
        [user_id]
      );

      if (userResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      const username = userResult.rows[0].username || 'there';
      const enhancedPersonalizationData = {
        username,
        ...personalization_data
      };

      const notification = await sendNotification(
        type,
        user_id,
        enhancedPersonalizationData,
        options
      );

      const response: NotificationResponse = {
        success: true,
        notification,
        message: 'Notification sent successfully'
      };

      return NextResponse.json(response);
    } else {
      // Send to multiple users

      // Get usernames for personalization
      const usersResult = await executeQuery(
        `SELECT id, username FROM users WHERE id = ANY($1)`,
        [user_ids]
      );

      const userMap = new Map(
        usersResult.rows.map(user => [user.id, user.username || 'there'])
      );

      // Filter out users that don't exist
      const validUserIds = user_ids!.filter(id => userMap.has(id));

      if (validUserIds.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No valid users found' },
          { status: 404 }
        );
      }

      const notifications = await sendBulkNotifications(
        type,
        validUserIds,
        (userId) => ({
          username: userMap.get(userId),
          ...personalization_data
        }),
        options
      );

      const response: ApiResponse = {
        success: true,
        data: {
          notifications,
          total_sent: notifications.length,
          total_requested: user_ids!.length,
          failed_count: user_ids!.length - notifications.length
        },
        message: `Sent ${notifications.length}/${user_ids!.length} notifications successfully`
      };

      return NextResponse.json(response);
    }
  } catch (error) {
    console.error('Failed to send notification:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send notification',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper endpoint to send common notification types
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const preset = searchParams.get('preset');

    if (!preset) {
      return NextResponse.json(
        { success: false, error: 'Preset type is required' },
        { status: 400 }
      );
    }

    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    if (userRole !== 'admin' && !request.headers.get('x-system-request')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();

    let result;

    switch (preset) {
      case 'high_paying_task_alert':
        {
          const { user_ids, task_data } = body;

          if (!user_ids || !task_data) {
            return NextResponse.json(
              { success: false, error: 'user_ids and task_data are required' },
              { status: 400 }
            );
          }

          // Get usernames for personalization
          const usersResult = await executeQuery(
            `SELECT id, username FROM users WHERE id = ANY($1)`,
            [user_ids]
          );

          const userMap = new Map(
            usersResult.rows.map(user => [user.id, user.username || 'there'])
          );

          const validUserIds = user_ids.filter((id: string) => userMap.has(id));

          result = await sendBulkNotifications(
            'high_paying_task',
            validUserIds,
            (userId) => ({
              username: userMap.get(userId),
              task_id: task_data.task_id,
              task_title: task_data.title,
              amount: task_data.amount,
              currency: task_data.currency,
              task_type: task_data.task_type
            }),
            {
              priority: 'urgent',
              metadata: { task_id: task_data.task_id },
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            }
          );
        }
        break;

      case 'payment_received':
        {
          const { user_id, payment_data } = body;

          if (!user_id || !payment_data) {
            return NextResponse.json(
              { success: false, error: 'user_id and payment_data are required' },
              { status: 400 }
            );
          }

          // Get username
          const userResult = await executeQuery(
            'SELECT username FROM users WHERE id = $1',
            [user_id]
          );

          if (userResult.rows.length === 0) {
            return NextResponse.json(
              { success: false, error: 'User not found' },
              { status: 404 }
            );
          }

          const username = userResult.rows[0].username || 'there';

          result = await sendNotification(
            'payment_received',
            user_id,
            {
              username,
              amount: payment_data.amount,
              currency: payment_data.currency,
              task_title: payment_data.task_title
            },
            {
              priority: 'high',
              metadata: {
                task_id: payment_data.task_id,
                amount: payment_data.amount,
                currency: payment_data.currency
              }
            }
          );
        }
        break;

      case 'streak_milestone':
        {
          const { user_id, streak_count } = body;

          if (!user_id || !streak_count) {
            return NextResponse.json(
              { success: false, error: 'user_id and streak_count are required' },
              { status: 400 }
            );
          }

          // Get username
          const userResult = await executeQuery(
            'SELECT username FROM users WHERE id = $1',
            [user_id]
          );

          if (userResult.rows.length === 0) {
            return NextResponse.json(
              { success: false, error: 'User not found' },
              { status: 404 }
            );
          }

          const username = userResult.rows[0].username || 'there';

          result = await sendNotification(
            'streak_milestone',
            user_id,
            {
              username,
              streak_count
            },
            {
              priority: 'medium',
              metadata: { streak_count }
            }
          );
        }
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Unknown preset: ${preset}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `${preset} notification(s) sent successfully`
    });
  } catch (error) {
    console.error('Failed to send preset notification:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send preset notification',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}