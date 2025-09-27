/**
 * Next Task endpoint
 * Returns the next available task for a user based on eligibility and verification level
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

interface TaskResponse {
  id: string;
  title: string;
  description: string;
  instructions: string;
  task_type: string;
  difficulty_level: number;
  estimated_time_minutes: number;
  reward_amount: number;
  reward_currency: string;
  requires_verification: boolean;
  verification_level_required: 'orb' | 'device';
  category_name?: string;
  creator_username?: string;
  expires_at?: string;
  priority: number;
}

/**
 * Get next available task for authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    // Require authentication
    const session = await requireAuth();

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const task_type = searchParams.get('task_type');
    const difficulty_max = searchParams.get('difficulty_max') ? parseInt(searchParams.get('difficulty_max')!) : null;
    const category_id = searchParams.get('category_id');
    const min_reward = searchParams.get('min_reward') ? parseFloat(searchParams.get('min_reward')!) : null;

    // Get user details to check verification level and eligibility
    const userResult = await executeQuery<{
      id: string;
      world_id: string;
      nullifier_hash: string;
      verification_level: 'orb' | 'device';
      reputation_score: number;
      is_active: boolean;
    }>(
      `SELECT id, world_id, nullifier_hash, verification_level, reputation_score, is_active
       FROM users
       WHERE nullifier_hash = $1 AND is_active = true
       LIMIT 1`,
      [session.nullifierHash]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // Build dynamic query based on filters and user eligibility
    let whereConditions = [
      't.status = $1',                    // Only active tasks
      't.expires_at > CURRENT_TIMESTAMP OR t.expires_at IS NULL', // Not expired
      'NOT EXISTS (SELECT 1 FROM submissions s WHERE s.task_id = t.id AND s.user_id = $2)', // User hasn't submitted
      'NOT EXISTS (SELECT 1 FROM submissions s WHERE s.task_id = t.id AND s.submitter_nullifier = $3)', // Nullifier hasn't been used
    ];

    let queryParams: any[] = ['active', user.id, user.nullifier_hash];
    let paramIndex = 4;

    // Add verification level filter
    whereConditions.push(`(
      (t.requires_verification = false) OR
      (t.requires_verification = true AND $${paramIndex} = 'orb') OR
      (t.requires_verification = true AND t.verification_level_required = 'device')
    )`);
    queryParams.push(user.verification_level);
    paramIndex++;

    // Add task type filter
    if (task_type) {
      whereConditions.push(`t.task_type = $${paramIndex}`);
      queryParams.push(task_type);
      paramIndex++;
    }

    // Add difficulty filter
    if (difficulty_max !== null) {
      whereConditions.push(`t.difficulty_level <= $${paramIndex}`);
      queryParams.push(difficulty_max);
      paramIndex++;
    }

    // Add category filter
    if (category_id) {
      whereConditions.push(`t.category_id = $${paramIndex}`);
      queryParams.push(category_id);
      paramIndex++;
    }

    // Add minimum reward filter
    if (min_reward !== null) {
      whereConditions.push(`t.reward_amount >= $${paramIndex}`);
      queryParams.push(min_reward);
      paramIndex++;
    }

    // Check if task has available submission slots
    whereConditions.push(`(
      SELECT COUNT(*)
      FROM submissions s
      WHERE s.task_id = t.id
    ) < t.max_submissions`);

    const whereClause = whereConditions.join(' AND ');

    // Query for next available task with user preference scoring
    const tasksResult = await executeQuery<TaskResponse>(
      `SELECT DISTINCT
         t.id,
         t.title,
         t.description,
         t.instructions,
         t.task_type,
         t.difficulty_level,
         t.estimated_time_minutes,
         t.reward_amount,
         t.reward_currency,
         t.requires_verification,
         COALESCE(t.verification_criteria->>'level', 'device') as verification_level_required,
         t.priority,
         t.expires_at,
         tc.name as category_name,
         u.username as creator_username,
         -- Scoring algorithm for task recommendation
         (
           -- Priority weight (1-5 scale)
           (t.priority * 2) +
           -- Reward weight (normalized)
           (LEAST(t.reward_amount / 10.0, 5)) +
           -- Difficulty match (prefer tasks near user's skill level)
           (CASE
             WHEN t.difficulty_level <= ($${paramIndex}) THEN 3
             WHEN t.difficulty_level = ($${paramIndex} + 1) THEN 2
             ELSE 1
           END) +
           -- Recency bonus (newer tasks get slight preference)
           (CASE WHEN t.created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours' THEN 1 ELSE 0 END)
         ) as recommendation_score
       FROM tasks t
       LEFT JOIN task_categories tc ON t.category_id = tc.id
       LEFT JOIN users u ON t.creator_id = u.id
       WHERE ${whereClause}
       ORDER BY recommendation_score DESC, t.created_at DESC
       LIMIT 1`,
      [...queryParams, user.reputation_score > 50 ? 3 : 2] // Skill level estimation
    );

    if (tasksResult.rows.length === 0) {
      // No tasks available - return helpful information
      const totalTasksResult = await executeQuery<{ count: string }>(
        `SELECT COUNT(*) as count FROM tasks WHERE status = 'active'`
      );

      const userSubmissionsResult = await executeQuery<{ count: string }>(
        `SELECT COUNT(*) as count FROM submissions WHERE user_id = $1`,
        [user.id]
      );

      return NextResponse.json({
        task: null,
        message: 'No tasks available at the moment',
        suggestions: {
          total_active_tasks: parseInt(totalTasksResult.rows[0]?.count || '0'),
          user_completed_tasks: parseInt(userSubmissionsResult.rows[0]?.count || '0'),
          try_different_filters: task_type || difficulty_max || category_id ? true : false,
          verification_level: user.verification_level,
          reputation_score: user.reputation_score
        }
      });
    }

    const task = tasksResult.rows[0];

    // Get additional task metadata
    const submissionCountResult = await executeQuery<{ count: string; approved_count: string }>(
      `SELECT
         COUNT(*) as count,
         COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count
       FROM submissions
       WHERE task_id = $1`,
      [task.id]
    );

    const submissionStats = submissionCountResult.rows[0];

    return NextResponse.json({
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
        requires_verification: task.requires_verification,
        verification_level_required: task.verification_level_required,
        category_name: task.category_name,
        creator_username: task.creator_username,
        expires_at: task.expires_at,
        priority: task.priority,
        submission_stats: {
          total_submissions: parseInt(submissionStats?.count || '0'),
          approved_submissions: parseInt(submissionStats?.approved_count || '0')
        }
      },
      user_eligibility: {
        verification_level: user.verification_level,
        reputation_score: user.reputation_score,
        can_access: true,
        estimated_completion_time: task.estimated_time_minutes
      },
      recommendation_metadata: {
        filters_applied: {
          task_type: task_type || null,
          max_difficulty: difficulty_max || null,
          category_id: category_id || null,
          min_reward: min_reward || null
        },
        user_profile: {
          total_submissions: parseInt(userSubmissionsResult.rows[0]?.count || '0'),
          verification_level: user.verification_level
        }
      }
    });

  } catch (error) {
    console.error('Next task fetch error:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch next task' },
      { status: 500 }
    );
  }
}

/**
 * Get multiple recommended tasks (alternative endpoint)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { limit = 5, preferences = {} } = await req.json();

    // Get user details
    const userResult = await executeQuery<{
      id: string;
      verification_level: 'orb' | 'device';
      reputation_score: number;
    }>(
      `SELECT id, verification_level, reputation_score
       FROM users
       WHERE nullifier_hash = $1 AND is_active = true
       LIMIT 1`,
      [session.nullifierHash]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // Build query with user preferences
    let whereConditions = [
      't.status = $1',
      't.expires_at > CURRENT_TIMESTAMP OR t.expires_at IS NULL',
      'NOT EXISTS (SELECT 1 FROM submissions s WHERE s.task_id = t.id AND s.user_id = $2)',
      'NOT EXISTS (SELECT 1 FROM submissions s WHERE s.task_id = t.id AND s.submitter_nullifier = $3)',
      '(SELECT COUNT(*) FROM submissions s WHERE s.task_id = t.id) < t.max_submissions'
    ];

    let queryParams: any[] = ['active', user.id, session.nullifierHash];

    // Add preference-based filters
    if (preferences.task_types && preferences.task_types.length > 0) {
      const placeholders = preferences.task_types.map((_: any, i: number) => `$${queryParams.length + i + 1}`).join(',');
      whereConditions.push(`t.task_type IN (${placeholders})`);
      queryParams.push(...preferences.task_types);
    }

    if (preferences.max_difficulty) {
      queryParams.push(preferences.max_difficulty);
      whereConditions.push(`t.difficulty_level <= $${queryParams.length}`);
    }

    const whereClause = whereConditions.join(' AND ');

    const tasksResult = await executeQuery<TaskResponse>(
      `SELECT
         t.id, t.title, t.description, t.task_type, t.difficulty_level,
         t.estimated_time_minutes, t.reward_amount, t.reward_currency,
         t.priority, tc.name as category_name,
         (t.priority * 2 + LEAST(t.reward_amount / 10.0, 5)) as score
       FROM tasks t
       LEFT JOIN task_categories tc ON t.category_id = tc.id
       WHERE ${whereClause}
       ORDER BY score DESC, t.created_at DESC
       LIMIT $${queryParams.length + 1}`,
      [...queryParams, Math.min(Math.max(limit, 1), 20)] // Limit between 1-20
    );

    return NextResponse.json({
      tasks: tasksResult.rows,
      user_verification_level: user.verification_level,
      total_recommended: tasksResult.rows.length
    });

  } catch (error) {
    console.error('Task recommendations error:', error);
    return NextResponse.json(
      { error: 'Failed to get task recommendations' },
      { status: 500 }
    );
  }
}