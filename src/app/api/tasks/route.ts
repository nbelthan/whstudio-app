/**
 * Minimal Tasks API for RLHF Demo
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

/**
 * Get tasks list - simplified for demo
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status') || 'active';

    // Validate parameters
    if (limit > 100 || limit < 1 || offset < 0) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    // Get tasks from database
    const result = await sql`
      SELECT
        t.id,
        t.title,
        t.description,
        t.task_type,
        t.instructions,
        t.reward_amount,
        t.reward_currency,
        t.max_submissions,
        t.difficulty_level,
        t.estimated_time_minutes,
        t.created_at,
        t.expires_at,
        tc.name as category_name
      FROM tasks t
      LEFT JOIN task_categories tc ON t.category_id = tc.id
      WHERE t.status = ${status}
      ORDER BY t.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const tasks = result.rows.map((task: any) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      task_type: task.task_type,
      instructions: task.instructions,
      reward_amount: parseFloat(task.reward_amount),
      reward_currency: task.reward_currency,
      max_submissions: task.max_submissions,
      difficulty_level: task.difficulty_level,
      estimated_time_minutes: task.estimated_time_minutes,
      category_name: task.category_name,
      created_at: task.created_at,
      expires_at: task.expires_at,
      user_has_submitted: false // Simplified for demo
    }));

    return NextResponse.json({
      success: true,
      tasks,
      pagination: {
        limit,
        offset,
        total: tasks.length
      }
    });

  } catch (error) {
    console.error('Tasks API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

/**
 * Create new task - simplified for demo
 */
export async function POST(req: NextRequest) {
  try {
    return NextResponse.json(
      { error: 'Task creation not implemented in demo' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Task creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}