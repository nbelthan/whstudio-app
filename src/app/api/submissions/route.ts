/**
 * Task Submissions API endpoint
 * Handles task submission creation, validation, and retrieval with World ID integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, withTransaction } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const maxDuration = 20; // Allow more time for file uploads

interface CreateSubmissionRequest {
  task_id: string;
  action_id: string;
  nullifier_hash: string;
  submission_data: any;
  attachments_urls?: string[];
  time_spent_minutes?: number;
}

interface SubmissionWithTask {
  id: string;
  task_id: string;
  user_id: string;
  submitter_nullifier: string;
  submission_data: any;
  attachments_urls: string[];
  time_spent_minutes: number;
  quality_score: number;
  status: string;
  reviewer_id: string;
  review_notes: string;
  reviewed_at: string;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
  task: {
    title: string;
    description: string;
    task_type: string;
    difficulty_level: number;
    reward_amount: number;
    reward_currency: string;
    creator_username: string;
    category_name: string;
  };
}

/**
 * Get user's submissions with filtering and pagination
 */
export async function GET(req: NextRequest) {
  try {
    // For demo mode, return mock submissions without authentication
    const { searchParams } = new URL(req.url);
    const isDemoMode = process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL;

    if (isDemoMode) {
      // Get demo submissions from headers (passed from client localStorage)
      const storedSubmissionsHeader = req.headers.get('x-demo-submissions');
      let storedSubmissions = [];

      try {
        if (storedSubmissionsHeader) {
          storedSubmissions = JSON.parse(decodeURIComponent(storedSubmissionsHeader));
        }
      } catch (e) {
        console.log('Could not parse stored submissions:', e);
      }

      // Generate demo submissions based on submission count
      const submissionCount = parseInt(req.headers.get('x-demo-submission-count') || '0');
      const totalEarned = parseFloat(req.headers.get('x-demo-total-earned') || '0');

      // Create default demo submissions if we have submission count but no stored data
      const demoSubmissions = storedSubmissions.length > 0 ? storedSubmissions :
        submissionCount > 0 ? Array.from({ length: Math.min(submissionCount, 10) }, (_, index) => ({
          id: `demo-${index + 1}`,
          task_id: `task-${index + 1}`,
          submission_data: { chosen_response: index % 2 === 0 ? 'A' : 'B', confidence: 3 + (index % 3) },
          attachments_urls: [],
          time_spent_minutes: 3 + (index % 5),
          quality_score: 4 + (index % 2),
          status: 'approved',
          review_notes: 'Great work!',
          reviewed_at: new Date(Date.now() - (index * 3600000)).toISOString(),
          is_paid: true,
          created_at: new Date(Date.now() - (index * 7200000)).toISOString(),
          updated_at: new Date(Date.now() - (index * 3600000)).toISOString(),
          task: {
            title: `A/B Preference Task #${150 - index}`,
            description: 'Compare AI responses and choose the better one',
            task_type: 'rlhf_rating',
            difficulty_level: 1 + (index % 3),
            reward_amount: Number(process.env.DEMO_REWARD ?? '0.02'),
            reward_currency: (process.env.DEMO_CURRENCY ?? 'USDC').toUpperCase(),
            creator_username: 'System',
            category_name: 'RLHF Rating'
          }
        })) : [];

      // Apply status filter
      const status = searchParams.get('status') || 'all';
      const filteredSubmissions = status === 'all'
        ? demoSubmissions
        : demoSubmissions.filter(s => s.status === status);

      return NextResponse.json({
        success: true,
        data: {
          submissions: filteredSubmissions,
          pagination: {
            limit: 20,
            offset: 0,
            total: filteredSubmissions.length,
            has_next: false
          },
          stats: {
            total: demoSubmissions.length,
            pending: demoSubmissions.filter(s => s.status === 'pending').length,
            approved: demoSubmissions.filter(s => s.status === 'approved').length,
            rejected: demoSubmissions.filter(s => s.status === 'rejected').length,
            under_review: demoSubmissions.filter(s => s.status === 'under_review').length,
            total_earnings: totalEarned || (demoSubmissions.length * Number(process.env.DEMO_REWARD ?? '0.02')),
            average_quality_score: demoSubmissions.length > 0
              ? demoSubmissions.reduce((acc, s) => acc + s.quality_score, 0) / demoSubmissions.length
              : 0,
            total_time_spent: demoSubmissions.reduce((acc, s) => acc + s.time_spent_minutes, 0),
            approval_rate: demoSubmissions.length > 0
              ? (demoSubmissions.filter(s => s.status === 'approved').length / demoSubmissions.length * 100)
              : 0
          }
        }
      });
    }

    // Original authentication code for production
    const session = await requireAuth();

    // Parse query parameters
    const status = searchParams.get('status') || 'all'; // 'pending', 'approved', 'rejected', 'under_review', 'all'
    const task_type = searchParams.get('task_type');
    const category = searchParams.get('category');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'created_at'; // 'created_at', 'updated_at', 'quality_score', 'reward_amount'
    const order = searchParams.get('order') || 'desc'; // 'asc', 'desc'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
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

    // Build dynamic query
    let whereConditions = ['s.user_id = $1'];
    let queryParams: any[] = [userId];
    let paramIndex = 2;

    // Add status filter
    if (status !== 'all') {
      whereConditions.push(`s.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    // Add task type filter
    if (task_type) {
      whereConditions.push(`t.task_type = $${paramIndex}`);
      queryParams.push(task_type);
      paramIndex++;
    }

    // Add date range filter
    if (date_from) {
      whereConditions.push(`s.created_at >= $${paramIndex}`);
      queryParams.push(date_from);
      paramIndex++;
    }

    if (date_to) {
      whereConditions.push(`s.created_at <= $${paramIndex}`);
      queryParams.push(date_to);
      paramIndex++;
    }

    // Add search filter (simple text search in task title and description)
    if (search) {
      whereConditions.push(`(
        t.title ILIKE $${paramIndex} OR
        t.description ILIKE $${paramIndex} OR
        s.review_notes ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Add category filter
    if (category && category !== 'all') {
      whereConditions.push(`tc.name ILIKE $${paramIndex}`);
      queryParams.push(`%${category}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Validate sort column
    const allowedSortColumns = ['created_at', 'updated_at', 'quality_score', 'reward_amount', 'status'];
    const sortColumn = allowedSortColumns.includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    // Get submissions with task details
    const submissionsResult = await executeQuery<SubmissionWithTask>(
      `SELECT
         s.id,
         s.task_id,
         s.user_id,
         s.submitter_nullifier,
         s.submission_data,
         s.attachments_urls,
         s.time_spent_minutes,
         s.quality_score,
         s.status,
         s.reviewer_id,
         s.review_notes,
         s.reviewed_at,
         s.is_paid,
         s.created_at,
         s.updated_at,
         t.title as task_title,
         t.description as task_description,
         t.task_type,
         t.difficulty_level,
         t.reward_amount,
         t.reward_currency,
         tc.name as category_name,
         creator.username as creator_username,
         COUNT(*) OVER() as total_count
       FROM submissions s
       JOIN tasks t ON s.task_id = t.id
       LEFT JOIN task_categories tc ON t.category_id = tc.id
       LEFT JOIN users creator ON t.creator_id = creator.id
       WHERE ${whereClause}
       ORDER BY ${sortColumn === 'reward_amount' ? 't.reward_amount' : 's.' + sortColumn} ${sortOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    // Get statistics
    const statsResult = await executeQuery<{
      total: string;
      pending: string;
      approved: string;
      rejected: string;
      under_review: string;
      total_earnings: string;
      average_quality_score: string;
      total_time_spent: string;
    }>(
      `SELECT
         COUNT(*) as total,
         COUNT(CASE WHEN s.status = 'pending' THEN 1 END) as pending,
         COUNT(CASE WHEN s.status = 'approved' THEN 1 END) as approved,
         COUNT(CASE WHEN s.status = 'rejected' THEN 1 END) as rejected,
         COUNT(CASE WHEN s.status = 'under_review' THEN 1 END) as under_review,
         SUM(CASE WHEN s.is_paid = true THEN t.reward_amount ELSE 0 END) as total_earnings,
         AVG(s.quality_score) as average_quality_score,
         SUM(s.time_spent_minutes) as total_time_spent
       FROM submissions s
       JOIN tasks t ON s.task_id = t.id
       LEFT JOIN task_categories tc ON t.category_id = tc.id
       WHERE ${whereConditions.slice(0, -2).join(' AND ')}`, // Remove limit/offset conditions for stats
      queryParams.slice(0, -2) // Remove limit/offset params
    );

    const stats = statsResult.rows[0];
    const totalCount = submissionsResult.rows.length > 0 ? parseInt(submissionsResult.rows[0].total_count) : 0;

    // Format submissions
    const formattedSubmissions = submissionsResult.rows.map(row => ({
      id: row.id,
      task_id: row.task_id,
      submission_data: row.submission_data,
      attachments_urls: row.attachments_urls || [],
      time_spent_minutes: row.time_spent_minutes,
      quality_score: row.quality_score,
      status: row.status,
      review_notes: row.review_notes,
      reviewed_at: row.reviewed_at,
      is_paid: row.is_paid,
      created_at: row.created_at,
      updated_at: row.updated_at,
      task: {
        title: row.task_title,
        description: row.task_description,
        task_type: row.task_type,
        difficulty_level: row.difficulty_level,
        reward_amount: row.reward_amount,
        reward_currency: row.reward_currency,
        creator_username: row.creator_username,
        category_name: row.category_name
      }
    }));

    return NextResponse.json({
      success: true,
      data: {
        submissions: formattedSubmissions,
        pagination: {
          limit,
          offset,
          total: totalCount,
          has_next: offset + formattedSubmissions.length < totalCount
        },
        stats: {
          total: parseInt(stats?.total || '0'),
          pending: parseInt(stats?.pending || '0'),
          approved: parseInt(stats?.approved || '0'),
          rejected: parseInt(stats?.rejected || '0'),
          under_review: parseInt(stats?.under_review || '0'),
          total_earnings: parseFloat(stats?.total_earnings || '0'),
          average_quality_score: stats?.average_quality_score ? parseFloat(stats.average_quality_score) : null,
          total_time_spent: parseInt(stats?.total_time_spent || '0'),
          approval_rate: parseInt(stats?.total || '0') > 0
            ? parseFloat(((parseInt(stats?.approved || '0') / parseInt(stats?.total || '0')) * 100).toFixed(1))
            : 0
        },
        filters: {
          status,
          task_type,
          category,
          date_from,
          date_to,
          search,
          sort,
          order
        }
      }
    });

  } catch (error) {
    console.error('Get submissions error:', error);

    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}

/**
 * Create a new task submission with World ID validation
 */
export async function POST(req: NextRequest) {
  try {
    // For demo mode, create mock submission without authentication
    const isDemoMode = process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL;

    if (isDemoMode) {
      const body = await req.json();

      // Create mock submission response
      const mockSubmission = {
        id: `sub_${Date.now()}`,
        task_id: body.task_id,
        user_id: 'demo_user',
        submitter_nullifier: 'demo_nullifier',
        submission_data: body.submission_data,
        attachments_urls: body.attachments_urls || [],
        time_spent_minutes: body.time_spent_minutes || 5,
        status: 'approved', // Instant approval in demo
        created_at: new Date().toISOString()
      };

      return NextResponse.json({
        success: true,
        submission: mockSubmission,
        task: {
          id: body.task_id,
          title: 'Demo Task',
          task_type: 'rlhf_rating',
          reward_amount: Number(process.env.DEMO_REWARD ?? '0.02'),
          reward_currency: (process.env.DEMO_CURRENCY ?? 'USDC').toUpperCase()
        },
        next_steps: {
          status: 'approved',
          message: 'Submission approved! Reward credited.',
          payment_info: {
            amount: Number(process.env.DEMO_REWARD ?? '0.02'),
            currency: (process.env.DEMO_CURRENCY ?? 'USDC').toUpperCase(),
            will_be_paid_after: 'instant'
          }
        }
      });
    }

    // Original authentication code for production
    const session = await requireAuth();
    const {
      task_id,
      action_id,
      nullifier_hash,
      submission_data,
      attachments_urls = [],
      time_spent_minutes
    }: CreateSubmissionRequest = await req.json();

    // Validate required fields
    if (!task_id || !action_id || !nullifier_hash || !submission_data) {
      return NextResponse.json(
        { error: 'Missing required fields: task_id, action_id, nullifier_hash, submission_data' },
        { status: 400 }
      );
    }

    // Validate UUID format for task_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(task_id)) {
      return NextResponse.json(
        { error: 'Invalid task_id format' },
        { status: 400 }
      );
    }

    // Validate action_id format
    if (!/^[a-z0-9_-]+$/.test(action_id) || action_id.length < 3 || action_id.length > 50) {
      return NextResponse.json(
        { error: 'Invalid action_id format' },
        { status: 400 }
      );
    }

    // Validate nullifier hash matches session
    if (nullifier_hash !== session.nullifierHash) {
      return NextResponse.json(
        { error: 'Nullifier hash mismatch' },
        { status: 400 }
      );
    }

    // Get user details
    const userResult = await executeQuery<{
      id: string;
      verification_level: 'orb' | 'device';
      is_active: boolean;
    }>(
      `SELECT id, verification_level, is_active
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

    // Use transaction to ensure data consistency
    const result = await withTransaction(async (client) => {
      // Get task details with lock
      const taskResult = await client.query(
        `SELECT
           id, title, description, task_type, difficulty_level,
           reward_amount, reward_currency, max_submissions,
           requires_verification, verification_criteria, status,
           expires_at, creator_id
         FROM tasks
         WHERE id = $1
         FOR UPDATE`,
        [task_id]
      );

      if (taskResult.rows.length === 0) {
        throw new Error('Task not found');
      }

      const task = taskResult.rows[0];

      // Validate task eligibility
      if (task.status !== 'active') {
        throw new Error('Task is not active');
      }

      if (task.expires_at && new Date(task.expires_at) <= new Date()) {
        throw new Error('Task has expired');
      }

      if (task.creator_id === user.id) {
        throw new Error('Cannot submit to your own task');
      }

      // Check verification requirements
      if (task.requires_verification) {
        const requiredLevel = task.verification_criteria?.level || 'device';
        if (requiredLevel === 'orb' && user.verification_level !== 'orb') {
          throw new Error('Orb verification required for this task');
        }
      }

      // Check for duplicate submissions
      const existingSubmission = await client.query(
        `SELECT id FROM submissions
         WHERE task_id = $1 AND (user_id = $2 OR submitter_nullifier = $3)
         LIMIT 1`,
        [task_id, user.id, nullifier_hash]
      );

      if (existingSubmission.rows.length > 0) {
        throw new Error('You have already submitted to this task');
      }

      // Check submission capacity
      const submissionCount = await client.query(
        `SELECT COUNT(*) as count FROM submissions WHERE task_id = $1`,
        [task_id]
      );

      const currentSubmissions = parseInt(submissionCount.rows[0]?.count || '0');
      if (currentSubmissions >= task.max_submissions) {
        throw new Error('Task has reached maximum submissions');
      }

      // Create submission
      const submissionResult = await client.query(
        `INSERT INTO submissions
         (task_id, user_id, submitter_nullifier, submission_data, attachments_urls, time_spent_minutes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          task_id,
          user.id,
          nullifier_hash,
          JSON.stringify(submission_data),
          attachments_urls,
          time_spent_minutes || null
        ]
      );

      const submission = submissionResult.rows[0];

      return {
        submission,
        task: {
          id: task.id,
          title: task.title,
          task_type: task.task_type,
          reward_amount: task.reward_amount,
          reward_currency: task.reward_currency
        }
      };
    });

    return NextResponse.json({
      success: true,
      submission: {
        id: result.submission.id,
        task_id: result.submission.task_id,
        user_id: result.submission.user_id,
        submitter_nullifier: result.submission.submitter_nullifier,
        submission_data: result.submission.submission_data,
        attachments_urls: result.submission.attachments_urls || [],
        time_spent_minutes: result.submission.time_spent_minutes,
        status: result.submission.status,
        created_at: result.submission.created_at
      },
      task: result.task,
      next_steps: {
        status: 'pending',
        message: 'Submission received and pending review',
        estimated_review_time: '24-48 hours',
        payment_info: {
          amount: result.task.reward_amount,
          currency: result.task.reward_currency,
          will_be_paid_after: 'approval'
        }
      }
    });

  } catch (error) {
    console.error('Create submission error:', error);

    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      if ([
        'Task not found',
        'Task is not active',
        'Task has expired',
        'Cannot submit to your own task',
        'You have already submitted to this task',
        'Task has reached maximum submissions',
        'Orb verification required for this task'
      ].includes(error.message)) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to create submission' },
      { status: 500 }
    );
  }
}