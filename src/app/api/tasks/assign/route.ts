/**
 * Task Assignment endpoint
 * Checks if a user can be assigned to a specific task and provides eligibility information
 * Since there's no separate task_assignments table, this endpoint validates assignment eligibility
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

interface AssignTaskRequest {
  task_id: string;
}

/**
 * Check if user can be assigned to a specific task
 */
export async function POST(req: NextRequest) {
  try {
    // Require authentication
    const session = await requireAuth();
    const { task_id }: AssignTaskRequest = await req.json();

    // Validate required fields
    if (!task_id) {
      return NextResponse.json(
        { error: 'task_id is required' },
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(task_id)) {
      return NextResponse.json(
        { error: 'Invalid task_id format' },
        { status: 400 }
      );
    }

    // Get user details
    const userResult = await executeQuery<{
      id: string;
      verification_level: 'orb' | 'device';
      reputation_score: number;
      is_active: boolean;
      nullifier_hash: string;
    }>(
      `SELECT id, verification_level, reputation_score, is_active, nullifier_hash
       FROM users
       WHERE nullifier_hash = $1
       LIMIT 1`,
      [session.nullifierHash]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // Get task details
    const taskResult = await executeQuery<{
      id: string;
      title: string;
      description: string;
      task_type: string;
      difficulty_level: number;
      estimated_time_minutes: number;
      reward_amount: number;
      reward_currency: string;
      max_submissions: number;
      requires_verification: boolean;
      status: string;
      expires_at: string;
      creator_id: string;
      verification_criteria: any;
    }>(
      `SELECT
         id, title, description, task_type, difficulty_level,
         estimated_time_minutes, reward_amount, reward_currency,
         max_submissions, requires_verification, status, expires_at,
         creator_id, verification_criteria
       FROM tasks
       WHERE id = $1`,
      [task_id]
    );

    if (taskResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const task = taskResult.rows[0];

    // Perform eligibility checks
    const eligibilityChecks = {
      task_exists: true,
      task_active: task.status === 'active',
      not_expired: !task.expires_at || new Date(task.expires_at) > new Date(),
      not_own_task: task.creator_id !== user.id,
      verification_level_ok: true,
      not_duplicate_submission: true,
      not_duplicate_nullifier: true,
      slots_available: true,
      user_active: user.is_active
    };

    let canAssign = true;
    const issues = [];

    // Check task status
    if (!eligibilityChecks.task_active) {
      canAssign = false;
      issues.push('Task is not active');
    }

    // Check expiration
    if (!eligibilityChecks.not_expired) {
      canAssign = false;
      issues.push('Task has expired');
    }

    // Check if user is task creator
    if (!eligibilityChecks.not_own_task) {
      canAssign = false;
      issues.push('Cannot assign your own task');
    }

    // Check verification level requirements
    if (task.requires_verification) {
      const requiredLevel = task.verification_criteria?.level || 'device';
      eligibilityChecks.verification_level_ok = !(requiredLevel === 'orb' && user.verification_level !== 'orb');

      if (!eligibilityChecks.verification_level_ok) {
        canAssign = false;
        issues.push('Orb verification required for this task');
      }
    }

    // Check for duplicate submission by user ID
    const existingSubmissionByUser = await executeQuery<{ count: string }>(
      `SELECT COUNT(*) as count FROM submissions WHERE task_id = $1 AND user_id = $2`,
      [task_id, user.id]
    );

    eligibilityChecks.not_duplicate_submission = parseInt(existingSubmissionByUser.rows[0]?.count || '0') === 0;
    if (!eligibilityChecks.not_duplicate_submission) {
      canAssign = false;
      issues.push('You have already submitted to this task');
    }

    // Check for duplicate submission by nullifier hash
    const existingSubmissionByNullifier = await executeQuery<{ count: string }>(
      `SELECT COUNT(*) as count FROM submissions WHERE task_id = $1 AND submitter_nullifier = $2`,
      [task_id, user.nullifier_hash]
    );

    eligibilityChecks.not_duplicate_nullifier = parseInt(existingSubmissionByNullifier.rows[0]?.count || '0') === 0;
    if (!eligibilityChecks.not_duplicate_nullifier) {
      canAssign = false;
      issues.push('This nullifier has already been used for this task');
    }

    // Check submission slots
    const submissionCount = await executeQuery<{ count: string }>(
      `SELECT COUNT(*) as count FROM submissions WHERE task_id = $1`,
      [task_id]
    );

    const currentSubmissions = parseInt(submissionCount.rows[0]?.count || '0');
    eligibilityChecks.slots_available = currentSubmissions < task.max_submissions;
    if (!eligibilityChecks.slots_available) {
      canAssign = false;
      issues.push('Task has reached maximum submissions');
    }

    // Get user's recent task activity
    const recentActivity = await executeQuery<{ count: string }>(
      `SELECT COUNT(*) as count FROM submissions
       WHERE user_id = $1 AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'`,
      [user.id]
    );

    const recentSubmissions = parseInt(recentActivity.rows[0]?.count || '0');

    return NextResponse.json({
      can_assign: canAssign,
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        task_type: task.task_type,
        difficulty_level: task.difficulty_level,
        estimated_time_minutes: task.estimated_time_minutes,
        reward_amount: task.reward_amount,
        reward_currency: task.reward_currency,
        max_submissions: task.max_submissions,
        current_submissions: currentSubmissions,
        requires_verification: task.requires_verification,
        verification_level_required: task.verification_criteria?.level || 'device'
      },
      user_eligibility: {
        verification_level: user.verification_level,
        reputation_score: user.reputation_score,
        recent_submissions_24h: recentSubmissions,
        is_active: user.is_active
      },
      eligibility_checks: eligibilityChecks,
      issues: issues.length > 0 ? issues : null,
      next_steps: canAssign ? {
        can_start_immediately: true,
        submit_endpoint: `/api/submissions`,
        task_url: `/tasks/${task_id}`,
        estimated_completion_time: task.estimated_time_minutes
      } : null
    });

  } catch (error) {
    console.error('Task assignment check error:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to check task assignment eligibility' },
      { status: 500 }
    );
  }
}

/**
 * Get user's task assignment history and current status
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'all'; // 'pending', 'approved', 'rejected', 'all'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    // Get user ID
    const userResult = await executeQuery<{ id: string }>(
      `SELECT id FROM users WHERE nullifier_hash = $1 AND is_active = true LIMIT 1`,
      [session.nullifierHash]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = userResult.rows[0].id;

    // Build status filter
    let statusFilter = '';
    const queryParams = [userId];
    let paramIndex = 2;

    if (status !== 'all') {
      statusFilter = `AND s.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    // Get user's submissions (which represent task assignments/completions)
    const submissionsResult = await executeQuery<{
      submission_id: string;
      task_id: string;
      task_title: string;
      task_type: string;
      difficulty_level: number;
      reward_amount: number;
      reward_currency: string;
      submission_status: string;
      submitted_at: string;
      is_paid: boolean;
      quality_score: number;
      time_spent_minutes: number;
    }>(
      `SELECT
         s.id as submission_id,
         s.task_id,
         s.status as submission_status,
         s.created_at as submitted_at,
         s.is_paid,
         s.quality_score,
         s.time_spent_minutes,
         t.title as task_title,
         t.task_type,
         t.difficulty_level,
         t.reward_amount,
         t.reward_currency
       FROM submissions s
       JOIN tasks t ON s.task_id = t.id
       WHERE s.user_id = $1 ${statusFilter}
       ORDER BY s.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    // Get total count
    const countResult = await executeQuery<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM submissions s
       WHERE s.user_id = $1 ${statusFilter}`,
      queryParams
    );

    const total = parseInt(countResult.rows[0]?.count || '0');

    // Get summary statistics
    const statsResult = await executeQuery<{
      total_submissions: string;
      approved_submissions: string;
      pending_submissions: string;
      total_earned: string;
      avg_quality_score: string;
    }>(
      `SELECT
         COUNT(*) as total_submissions,
         COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_submissions,
         COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_submissions,
         SUM(CASE WHEN is_paid = true THEN (SELECT reward_amount FROM tasks WHERE id = s.task_id) ELSE 0 END) as total_earned,
         AVG(quality_score) as avg_quality_score
       FROM submissions s
       WHERE s.user_id = $1`,
      [userId]
    );

    const stats = statsResult.rows[0];

    return NextResponse.json({
      submissions: submissionsResult.rows.map(row => ({
        submission_id: row.submission_id,
        task: {
          id: row.task_id,
          title: row.task_title,
          task_type: row.task_type,
          difficulty_level: row.difficulty_level,
          reward_amount: row.reward_amount,
          reward_currency: row.reward_currency
        },
        status: row.submission_status,
        submitted_at: row.submitted_at,
        is_paid: row.is_paid,
        quality_score: row.quality_score,
        time_spent_minutes: row.time_spent_minutes
      })),
      pagination: {
        limit,
        offset,
        total,
        has_more: offset + submissionsResult.rows.length < total
      },
      statistics: {
        total_submissions: parseInt(stats?.total_submissions || '0'),
        approved_submissions: parseInt(stats?.approved_submissions || '0'),
        pending_submissions: parseInt(stats?.pending_submissions || '0'),
        total_earned: parseFloat(stats?.total_earned || '0'),
        average_quality_score: parseFloat(stats?.avg_quality_score || '0'),
        approval_rate: parseInt(stats?.total_submissions || '0') > 0
          ? (parseInt(stats?.approved_submissions || '0') / parseInt(stats?.total_submissions || '0') * 100).toFixed(1)
          : '0'
      }
    });

  } catch (error) {
    console.error('Get assignment history error:', error);
    return NextResponse.json(
      { error: 'Failed to get assignment history' },
      { status: 500 }
    );
  }
}