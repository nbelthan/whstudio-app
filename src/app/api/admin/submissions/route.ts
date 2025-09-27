/**
 * Admin Submissions API
 * GET: Fetch all submissions for review with admin permissions
 * Supports comprehensive filtering and review management
 */

import { NextRequest, NextResponse } from 'next/server';
import { queries } from '../../../../../lib/db/client';
import { auth } from '../../../../../auth';
import { ReviewFilters } from '../../../../../lib/types/submissions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check admin permissions (assuming admin role is stored in session)
    if (session.user.role !== 'admin' && session.user.role !== 'reviewer') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Parse query parameters for admin filtering
    const filters: ReviewFilters = {
      status: (searchParams.get('status') as any) || 'pending',
      task_type: searchParams.get('task_type') || undefined,
      difficulty: searchParams.get('difficulty') ? parseInt(searchParams.get('difficulty')!) : undefined,
      priority: (searchParams.get('priority') as any) || undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      reviewer_id: searchParams.get('reviewer_id') || undefined,
      sort: (searchParams.get('sort') as any) || 'created_at',
      order: (searchParams.get('order') as any) || 'asc',
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0')
    };

    // Validate parameters
    if (filters.limit && (filters.limit < 1 || filters.limit > 100)) {
      return NextResponse.json(
        { success: false, error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    if (filters.offset && filters.offset < 0) {
      return NextResponse.json(
        { success: false, error: 'Offset must be non-negative' },
        { status: 400 }
      );
    }

    // Execute query for admin submissions review
    const result = await queries.submissions.findForReview(filters);

    // Process submissions data for admin view
    const submissions = result.map((row: any) => ({
      id: row.id,
      task_id: row.task_id,
      user_id: row.user_id,
      submitter_nullifier: row.submitter_nullifier,
      submission_data: row.submission_data,
      attachments_urls: row.attachments_urls,
      time_spent_minutes: row.time_spent_minutes,
      quality_score: row.quality_score,
      status: row.status,
      reviewer_id: row.reviewer_id,
      review_notes: row.review_notes,
      reviewed_at: row.reviewed_at,
      is_paid: row.is_paid,
      created_at: row.created_at,
      updated_at: row.updated_at,
      task: {
        id: row.task_id,
        title: row.task_title,
        description: row.task_description,
        instructions: row.task_instructions,
        task_type: row.task_type,
        difficulty_level: row.difficulty_level,
        estimated_time_minutes: row.estimated_time_minutes,
        reward_amount: parseFloat(row.reward_amount || '0'),
        reward_currency: row.reward_currency,
        creator_id: row.task_creator_id,
        creator_username: row.creator_username,
        category_name: row.category_name,
        expires_at: row.task_expires_at
      },
      submitter: {
        id: row.user_id,
        username: row.submitter_username,
        reputation_score: row.submitter_reputation || 0
      },
      reviewer: row.reviewer_username ? {
        id: row.reviewer_id,
        username: row.reviewer_username
      } : null,
      review_priority: row.review_priority || 'medium',
      estimated_review_time: calculateEstimatedReviewTime(row.task_type, row.difficulty_level),
      flags: generateFlags(row)
    }));

    // Calculate pagination
    const totalCount = submissions.length > 0 ? parseInt(result[0]?.total_count || '0') : 0;
    const totalPages = Math.ceil(totalCount / (filters.limit || 50));
    const currentPage = Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1;

    const pagination = {
      total: totalCount,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
      pages: totalPages,
      current_page: currentPage,
      has_next: currentPage < totalPages,
      has_prev: currentPage > 1
    };

    // Calculate summary stats for admin dashboard
    const stats = {
      total_pending: submissions.filter(s => s.status === 'pending').length,
      total_under_review: submissions.filter(s => s.status === 'under_review').length,
      high_priority: submissions.filter(s => s.review_priority === 'high').length,
      avg_review_time: calculateAverageReviewTime(submissions),
      total_value: submissions.reduce((sum, s) => sum + s.task.reward_amount, 0)
    };

    return NextResponse.json({
      success: true,
      data: {
        submissions,
        pagination,
        filters,
        stats
      }
    });

  } catch (error) {
    console.error('Admin submissions API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch submissions',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to calculate estimated review time
function calculateEstimatedReviewTime(taskType: string, difficulty: number): number {
  const baseTime = {
    'data_entry': 5,
    'content_review': 10,
    'transcription': 15,
    'translation': 20,
    'image_tagging': 5,
    'quality_assurance': 15,
    'research': 25,
    'creative_tasks': 30
  };

  const base = baseTime[taskType as keyof typeof baseTime] || 10;
  return Math.round(base * (difficulty / 3)); // Adjust based on difficulty
}

// Helper function to generate flags for submissions
function generateFlags(submission: any): string[] {
  const flags: string[] = [];

  // Time-based flags
  const submissionAge = new Date().getTime() - new Date(submission.created_at).getTime();
  const hoursOld = submissionAge / (1000 * 60 * 60);

  if (hoursOld > 24) flags.push('overdue');
  if (hoursOld > 72) flags.push('urgent');

  // Value-based flags
  if (submission.reward_amount >= 10) flags.push('high_value');

  // User-based flags
  if (submission.submitter_reputation < 50) flags.push('new_user');

  // Task-based flags
  if (submission.difficulty_level >= 4) flags.push('complex');

  return flags;
}

// Helper function to calculate average review time
function calculateAverageReviewTime(submissions: any[]): number {
  const reviewedSubmissions = submissions.filter(s => s.reviewed_at);

  if (reviewedSubmissions.length === 0) return 0;

  const totalTime = reviewedSubmissions.reduce((sum, submission) => {
    const reviewTime = new Date(submission.reviewed_at).getTime() - new Date(submission.created_at).getTime();
    return sum + reviewTime;
  }, 0);

  return Math.round(totalTime / reviewedSubmissions.length / (1000 * 60 * 60)); // Convert to hours
}