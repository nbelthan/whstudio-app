/**
 * Individual task API endpoints
 * Handles specific task operations by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, withAuth } from '@/lib/auth/session';
import { queries } from '@/lib/db/client';

/**
 * Get task by ID with submission details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      );
    }

    // Get task details
    const tasks = await queries.tasks.findById(id);

    if (tasks.length === 0) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const task = tasks[0];

    // Check if task is accessible
    if (task.status !== 'active' && task.status !== 'completed') {
      return NextResponse.json(
        { error: 'Task is not available' },
        { status: 403 }
      );
    }

    // Get current user and check for existing submission
    const user = await getCurrentUser();
    let userSubmission = null;
    let submissions = [];

    if (user) {
      const allSubmissions = await queries.submissions.findByTask(id);
      userSubmission = allSubmissions.find((sub: any) => sub.user_id === user.id);

      // If user is the creator, show all submissions
      if (user.id === task.creator_id) {
        submissions = allSubmissions.map((sub: any) => ({
          id: sub.id,
          submitter_username: sub.submitter_username,
          status: sub.status,
          quality_score: sub.quality_score,
          time_spent_minutes: sub.time_spent_minutes,
          created_at: sub.created_at,
          reviewed_at: sub.reviewed_at
        }));
      }
    }

    const response = {
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
      verification_criteria: task.verification_criteria,
      attachment_urls: task.attachment_urls,
      status: task.status,
      priority: task.priority,
      expires_at: task.expires_at,
      created_at: task.created_at,
      updated_at: task.updated_at,
      category_name: task.category_name,
      creator_username: task.creator_username,
      user_has_submitted: !!userSubmission,
      user_submission: userSubmission ? {
        id: userSubmission.id,
        status: userSubmission.status,
        quality_score: userSubmission.quality_score,
        time_spent_minutes: userSubmission.time_spent_minutes,
        created_at: userSubmission.created_at,
        reviewed_at: userSubmission.reviewed_at,
        review_notes: userSubmission.review_notes
      } : null,
      is_creator: user?.id === task.creator_id,
      submissions: submissions
    };

    return NextResponse.json({
      success: true,
      task: response
    });

  } catch (error) {
    console.error('Task fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

/**
 * Update task (creator only)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    try {
      const { id } = await params;
      const updates = await req.json();

      if (!id || typeof id !== 'string') {
        return NextResponse.json(
          { error: 'Invalid task ID' },
          { status: 400 }
        );
      }

      // Get task to verify ownership
      const tasks = await queries.tasks.findById(id);

      if (tasks.length === 0) {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        );
      }

      const task = tasks[0];

      if (task.creator_id !== user.id) {
        return NextResponse.json(
          { error: 'Only task creator can update this task' },
          { status: 403 }
        );
      }

      // Validate updateable fields
      const allowedFields = [
        'title', 'description', 'instructions', 'status',
        'priority', 'expires_at', 'max_submissions'
      ];

      const filteredUpdates: any = {};
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          filteredUpdates[field] = updates[field];
        }
      }

      if (Object.keys(filteredUpdates).length === 0) {
        return NextResponse.json(
          { error: 'No valid fields to update' },
          { status: 400 }
        );
      }

      // TODO: Implement task update query
      // For now, return a placeholder response
      return NextResponse.json({
        success: true,
        message: 'Task update functionality coming soon',
        updated_fields: Object.keys(filteredUpdates)
      });

    } catch (error) {
      console.error('Task update error:', error);
      return NextResponse.json(
        { error: 'Failed to update task' },
        { status: 500 }
      );
    }
  });
}

/**
 * Delete task (creator only)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    try {
      const { id } = await params;

      if (!id || typeof id !== 'string') {
        return NextResponse.json(
          { error: 'Invalid task ID' },
          { status: 400 }
        );
      }

      // Get task to verify ownership
      const tasks = await queries.tasks.findById(id);

      if (tasks.length === 0) {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        );
      }

      const task = tasks[0];

      if (task.creator_id !== user.id) {
        return NextResponse.json(
          { error: 'Only task creator can delete this task' },
          { status: 403 }
        );
      }

      // Check if task has active submissions
      const submissions = await queries.submissions.findByTask(id);
      const hasActiveSubmissions = submissions.some((sub: any) =>
        sub.status === 'pending' || sub.status === 'under_review'
      );

      if (hasActiveSubmissions) {
        return NextResponse.json(
          { error: 'Cannot delete task with pending submissions. Please review them first.' },
          { status: 409 }
        );
      }

      // TODO: Implement task deletion query
      // For now, return a placeholder response
      return NextResponse.json({
        success: true,
        message: 'Task deletion functionality coming soon'
      });

    } catch (error) {
      console.error('Task deletion error:', error);
      return NextResponse.json(
        { error: 'Failed to delete task' },
        { status: 500 }
      );
    }
  });
}