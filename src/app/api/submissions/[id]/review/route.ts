/**
 * Enhanced Submission Review API
 * PUT: Review submission (approve/reject) with notes and quality score
 * GET: Fetch submission details for review
 * Handles payment flow trigger and reviewer assignment
 */

import { NextRequest, NextResponse } from 'next/server';
import { queries, withTransaction } from '@/lib/db';
import { auth } from '@/auth';
import { getCurrentUser } from '@/lib/session';
import { ReviewSubmissionRequest } from '@/lib/types/submissions';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Get authenticated session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const submissionId = params.id;
    const body: ReviewSubmissionRequest = await request.json();
    const { status, review_notes, quality_score } = body;

    // Validate input
    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Status must be either "approved" or "rejected"' },
        { status: 400 }
      );
    }

    if (quality_score && (quality_score < 0 || quality_score > 5)) {
      return NextResponse.json(
        { success: false, error: 'Quality score must be between 0 and 5' },
        { status: 400 }
      );
    }

    // Fetch submission to check permissions and current status
    const submissionResult = await queries.submissions.findById(submissionId);
    if (!submissionResult || submissionResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Submission not found' },
        { status: 404 }
      );
    }

    const submission = submissionResult[0];

    // Check permissions - only task creator or assigned reviewer can review
    const isTaskCreator = submission.task_creator_id === session.user.id;
    const isReviewer = submission.reviewer_id === session.user.id;
    const isAdmin = session.user.role === 'admin';

    if (!isTaskCreator && !isReviewer && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to review this submission' },
        { status: 403 }
      );
    }

    // Check if submission can be reviewed
    if (!['pending', 'under_review'].includes(submission.status)) {
      return NextResponse.json(
        { success: false, error: `Submission cannot be reviewed. Current status: ${submission.status}` },
        { status: 400 }
      );
    }

    // Perform review and payment in transaction
    const result = await withTransaction(async (txDb) => {
      // Update submission status
      const updateResult = await queries.submissions.updateStatus(
        submissionId,
        status,
        review_notes,
        session.user.id,
        quality_score
      );

      const updatedSubmission = updateResult[0];

      let payment = null;

      // If approved, create payment
      if (status === 'approved') {
        const paymentData = {
          task_id: submission.task_id,
          submission_id: submissionId,
          payer_id: submission.task_creator_id,
          recipient_id: submission.user_id,
          amount: submission.reward_amount,
          currency: submission.reward_currency,
          payment_type: 'task_reward',
          blockchain_network: 'optimism', // Default network
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days expiry
        };

        const paymentResult = await queries.payments.create(paymentData);
        payment = paymentResult[0];

        // TODO: Integrate with actual payment processor
        // For now, mark as processing
        if (payment) {
          await queries.payments.updateStatus(payment.id, 'processing');
        }
      }

      return { updatedSubmission, payment };
    });

    // Fetch updated submission with all details
    const finalResult = await queries.submissions.findById(submissionId);
    const finalSubmission = finalResult[0];

    const response = {
      submission: {
        id: finalSubmission.id,
        task_id: finalSubmission.task_id,
        user_id: finalSubmission.user_id,
        submitter_nullifier: finalSubmission.submitter_nullifier,
        submission_data: finalSubmission.submission_data,
        attachments_urls: finalSubmission.attachments_urls,
        time_spent_minutes: finalSubmission.time_spent_minutes,
        quality_score: finalSubmission.quality_score,
        status: finalSubmission.status,
        reviewer_id: finalSubmission.reviewer_id,
        review_notes: finalSubmission.review_notes,
        reviewed_at: finalSubmission.reviewed_at,
        is_paid: finalSubmission.is_paid,
        created_at: finalSubmission.created_at,
        updated_at: finalSubmission.updated_at,
        task: {
          id: finalSubmission.task_id,
          title: finalSubmission.task_title,
          description: finalSubmission.task_description,
          instructions: finalSubmission.task_instructions,
          task_type: finalSubmission.task_type,
          difficulty_level: finalSubmission.difficulty_level,
          estimated_time_minutes: finalSubmission.estimated_time_minutes,
          reward_amount: parseFloat(finalSubmission.reward_amount || '0'),
          reward_currency: finalSubmission.reward_currency,
          creator_id: finalSubmission.task_creator_id,
          creator_username: finalSubmission.creator_username,
          category_name: finalSubmission.category_name,
          status: finalSubmission.task_status,
          expires_at: finalSubmission.task_expires_at,
          created_at: finalSubmission.task_created_at
        },
        submitter: {
          id: finalSubmission.user_id,
          username: finalSubmission.submitter_username,
          reputation_score: finalSubmission.submitter_reputation
        },
        reviewer: finalSubmission.reviewer_username ? {
          id: finalSubmission.reviewer_id,
          username: finalSubmission.reviewer_username
        } : null,
        payment: finalSubmission.payment_id ? {
          id: finalSubmission.payment_id,
          amount: parseFloat(finalSubmission.payment_amount || '0'),
          currency: finalSubmission.payment_currency,
          status: finalSubmission.payment_status,
          transaction_hash: finalSubmission.transaction_hash,
          processed_at: finalSubmission.payment_processed_at
        } : null
      },
      payment: result.payment ? {
        id: result.payment.id,
        status: 'processing',
        transaction_hash: result.payment.transaction_hash
      } : null
    };

    return NextResponse.json({
      success: true,
      data: response,
      message: `Submission ${status} successfully`
    });

  } catch (error) {
    console.error('Review submission error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to review submission',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Get authenticated session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const submissionId = params.id;

    // Fetch submission with all related data
    const result = await queries.submissions.findById(submissionId);
    if (!result || result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Submission not found' },
        { status: 404 }
      );
    }

    const row = result[0];

    // Check permissions - only task creator, reviewer, or admin can access
    const isTaskCreator = row.task_creator_id === session.user.id;
    const isReviewer = row.reviewer_id === session.user.id;
    const isAdmin = session.user.role === 'admin'; // Assuming role is stored in session

    if (!isTaskCreator && !isReviewer && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Format detailed submission response
    const submission = {
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
        status: row.task_status,
        expires_at: row.task_expires_at,
        created_at: row.task_created_at
      },
      submitter: {
        id: row.user_id,
        username: row.submitter_username,
        reputation_score: row.submitter_reputation
      },
      reviewer: row.reviewer_username ? {
        id: row.reviewer_id,
        username: row.reviewer_username
      } : null,
      payment: row.payment_id ? {
        id: row.payment_id,
        amount: parseFloat(row.payment_amount || '0'),
        currency: row.payment_currency,
        status: row.payment_status,
        transaction_hash: row.transaction_hash,
        processed_at: row.payment_processed_at
      } : null
    };

    return NextResponse.json({
      success: true,
      data: submission
    });

  } catch (error) {
    console.error('Get submission review error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch submission',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}