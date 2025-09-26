/**
 * Tasks API endpoints
 * Handles task creation, listing, and management
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, getCurrentUser } from '@/lib/auth/session';
import { queries } from '@/lib/db/client';

/**
 * Get tasks list with pagination and filtering
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const category = searchParams.get('category');
    const status = searchParams.get('status') || 'active';
    const difficulty = searchParams.get('difficulty');
    const sortBy = searchParams.get('sort') || 'priority';

    // Validate parameters
    if (limit > 100) {
      return NextResponse.json(
        { error: 'Limit cannot exceed 100' },
        { status: 400 }
      );
    }

    if (offset < 0 || limit < 1) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    // Get tasks based on filters
    const tasks = await queries.tasks.findActive(limit, offset);

    // Get current user to check for existing submissions
    const user = await getCurrentUser();
    const userId = user?.id;

    // For each task, check if current user has submitted
    const tasksWithStatus = await Promise.all(
      tasks.map(async (task: any) => {
        let userSubmission = null;
        if (userId) {
          try {
            const submissions = await queries.submissions.findByTask(task.id);
            userSubmission = submissions.find((sub: any) => sub.user_id === userId);
          } catch (error) {
            console.error('Error fetching user submissions:', error);
          }
        }

        return {
          id: task.id,
          title: task.title,
          description: task.description,
          task_type: task.task_type,
          difficulty_level: task.difficulty_level,
          estimated_time_minutes: task.estimated_time_minutes,
          reward_amount: task.reward_amount,
          reward_currency: task.reward_currency,
          max_submissions: task.max_submissions,
          status: task.status,
          priority: task.priority,
          expires_at: task.expires_at,
          created_at: task.created_at,
          category_name: task.category_name,
          creator_username: task.creator_username,
          user_has_submitted: !!userSubmission,
          user_submission_status: userSubmission?.status || null,
          is_creator: userId === task.creator_id
        };
      })
    );

    return NextResponse.json({
      success: true,
      tasks: tasksWithStatus,
      pagination: {
        limit,
        offset,
        count: tasksWithStatus.length,
        has_more: tasksWithStatus.length === limit
      }
    });

  } catch (error) {
    console.error('Tasks fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

/**
 * Create a new task (requires authentication)
 */
export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const taskData = await req.json();

      // Validate required fields
      const requiredFields = [
        'title', 'description', 'instructions', 'task_type',
        'difficulty_level', 'estimated_time_minutes', 'reward_amount'
      ];

      for (const field of requiredFields) {
        if (!taskData[field]) {
          return NextResponse.json(
            { error: `Missing required field: ${field}` },
            { status: 400 }
          );
        }
      }

      // Validate field types and constraints
      if (typeof taskData.title !== 'string' || taskData.title.length < 5 || taskData.title.length > 200) {
        return NextResponse.json(
          { error: 'Title must be between 5 and 200 characters' },
          { status: 400 }
        );
      }

      if (typeof taskData.description !== 'string' || taskData.description.length < 20 || taskData.description.length > 2000) {
        return NextResponse.json(
          { error: 'Description must be between 20 and 2000 characters' },
          { status: 400 }
        );
      }

      if (!Number.isInteger(taskData.difficulty_level) || taskData.difficulty_level < 1 || taskData.difficulty_level > 5) {
        return NextResponse.json(
          { error: 'Difficulty level must be between 1 and 5' },
          { status: 400 }
        );
      }

      if (!Number.isInteger(taskData.estimated_time_minutes) || taskData.estimated_time_minutes < 1) {
        return NextResponse.json(
          { error: 'Estimated time must be at least 1 minute' },
          { status: 400 }
        );
      }

      if (typeof taskData.reward_amount !== 'number' || taskData.reward_amount <= 0) {
        return NextResponse.json(
          { error: 'Reward amount must be a positive number' },
          { status: 400 }
        );
      }

      // Set defaults and validate optional fields
      const newTask = {
        creator_id: user.id,
        category_id: taskData.category_id || null,
        title: taskData.title.trim(),
        description: taskData.description.trim(),
        instructions: taskData.instructions.trim(),
        task_type: taskData.task_type,
        difficulty_level: taskData.difficulty_level,
        estimated_time_minutes: taskData.estimated_time_minutes,
        reward_amount: taskData.reward_amount,
        reward_currency: taskData.reward_currency || 'WLD',
        max_submissions: taskData.max_submissions || 1,
        requires_verification: taskData.requires_verification !== false, // default true
        expires_at: taskData.expires_at ? new Date(taskData.expires_at) : null
      };

      // Validate expiration date
      if (newTask.expires_at && newTask.expires_at <= new Date()) {
        return NextResponse.json(
          { error: 'Expiration date must be in the future' },
          { status: 400 }
        );
      }

      // Create task
      const createdTasks = await queries.tasks.create(newTask);

      if (createdTasks.length === 0) {
        throw new Error('Failed to create task');
      }

      const task = createdTasks[0];

      return NextResponse.json({
        success: true,
        task: {
          id: task.id,
          title: task.title,
          description: task.description,
          instructions: task.instructions,
          task_type: task.task_type,
          difficulty_level: task.difficulty_level,
          estimated_time_minutes: task.estimated_time_minutes,
          reward_amount: task.reward_amount,
          reward_currency: task.reward_currency,
          max_submissions: task.max_submissions,
          requires_verification: task.requires_verification,
          status: task.status,
          priority: task.priority,
          expires_at: task.expires_at,
          created_at: task.created_at
        }
      });

    } catch (error) {
      console.error('Task creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create task' },
        { status: 500 }
      );
    }
  });
}