/**
 * Submission review API endpoint
 * Handles submission approval, rejection, and scoring by task creators
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/session';
import { queries } from '@/lib/db/client';

/**
 * Review a submission (task creator only)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    try {
      const { id: submissionId } = await params;
      const reviewData = await req.json();

      if (!submissionId || typeof submissionId !== 'string') {
        return NextResponse.json(
          { error: 'Invalid submission ID' },
          { status: 400 }
        );
      }

      // Validate review data
      const { status, quality_score, review_notes } = reviewData;

      if (!status || !['approved', 'rejected', 'under_review'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be approved, rejected, or under_review' },
          { status: 400 }
        );
      }

      if (quality_score !== undefined) {
        if (typeof quality_score !== 'number' || quality_score < 0 || quality_score > 5) {
          return NextResponse.json(
            { error: 'Quality score must be between 0 and 5' },
            { status: 400 }
          );
        }
      }

      // Get submission details first to verify it exists and get task info
      const { db } = await import('@/lib/db/client');

      const submissionQuery = `
        SELECT s.*, t.creator_id, t.title as task_title, t.reward_amount, t.reward_currency,
               u.username as submitter_username
        FROM submissions s
        JOIN tasks t ON s.task_id = t.id
        JOIN users u ON s.user_id = u.id
        WHERE s.id = $1
      `;

      const submissions = await db(submissionQuery, [submissionId]);

      if (submissions.length === 0) {
        return NextResponse.json(
          { error: 'Submission not found' },
          { status: 404 }
        );
      }

      const submission = submissions[0];

      // Verify user is the task creator
      if (submission.creator_id !== user.id) {
        return NextResponse.json(
          { error: 'Only task creator can review submissions' },
          { status: 403 }
        );
      }

      // Check if submission is in a reviewable state
      if (submission.status === 'approved' || submission.status === 'rejected') {
        return NextResponse.json(
          { error: 'This submission has already been reviewed' },
          { status: 409 }
        );
      }

      // Update submission with review
      const updatedSubmissions = await queries.submissions.updateStatus(
        submissionId,
        status,
        review_notes,
        user.id
      );

      if (updatedSubmissions.length === 0) {
        throw new Error('Failed to update submission');
      }

      const updatedSubmission = updatedSubmissions[0];

      // If approved and has quality score, update it separately
      if (status === 'approved' && quality_score !== undefined) {
        // TODO: Add quality score update to the query builder
        const qualityUpdateQuery = `
          UPDATE submissions
          SET quality_score = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING *
        `;
        await db(qualityUpdateQuery, [quality_score, submissionId]);
      }

      // If approved, initiate payment process
      if (status === 'approved') {
        try {
          // Create payment record
          const paymentData = {
            task_id: submission.task_id,
            submission_id: submissionId,
            payer_id: submission.creator_id,
            recipient_id: submission.user_id,
            amount: submission.reward_amount,
            currency: submission.reward_currency || 'WLD',
            payment_type: 'task_reward',
            blockchain_network: 'optimism',
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
          };

          const createdPayments = await queries.payments.create(paymentData);

          if (createdPayments.length > 0) {
            // TODO: Trigger actual payment processing
            // For now, just mark as processing
            await queries.payments.updateStatus(createdPayments[0].id, 'processing');
          }
        } catch (paymentError) {
          console.error('Payment creation error:', paymentError);
          // Don't fail the review if payment creation fails
        }
      }

      // TODO: Send notification to submitter
      // TODO: Update user reputation score based on quality score

      const responseData = {
        id: updatedSubmission.id,
        status: updatedSubmission.status,
        quality_score: quality_score,
        review_notes: updatedSubmission.review_notes,
        reviewer_id: updatedSubmission.reviewer_id,
        reviewed_at: updatedSubmission.reviewed_at,
        updated_at: updatedSubmission.updated_at
      };

      return NextResponse.json({
        success: true,
        submission: responseData,
        message: `Submission ${status} successfully`,
        payment_initiated: status === 'approved'
      });

    } catch (error) {
      console.error('Review submission error:', error);
      return NextResponse.json(
        { error: 'Failed to review submission' },
        { status: 500 }
      );
    }
  });
}

/**
 * Get review details for a submission
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    try {
      const { id: submissionId } = await params;

      if (!submissionId || typeof submissionId !== 'string') {
        return NextResponse.json(
          { error: 'Invalid submission ID' },
          { status: 400 }
        );
      }

      // Get submission with review details
      const { db } = await import('@/lib/db/client');

      const query = `
        SELECT s.*, t.creator_id, t.title as task_title,
               reviewer.username as reviewer_username
        FROM submissions s
        JOIN tasks t ON s.task_id = t.id
        LEFT JOIN users reviewer ON s.reviewer_id = reviewer.id
        WHERE s.id = $1
      `;

      const submissions = await db(query, [submissionId]);

      if (submissions.length === 0) {
        return NextResponse.json(
          { error: 'Submission not found' },
          { status: 404 }
        );
      }

      const submission = submissions[0];

      // Check permissions (submitter or task creator)
      if (submission.user_id !== user.id && submission.creator_id !== user.id) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }

      const reviewData = {
        id: submission.id,
        task_id: submission.task_id,
        task_title: submission.task_title,
        status: submission.status,
        quality_score: submission.quality_score,
        review_notes: submission.review_notes,
        reviewer_username: submission.reviewer_username,
        reviewed_at: submission.reviewed_at,
        is_paid: submission.is_paid,
        created_at: submission.created_at,
        updated_at: submission.updated_at,
        is_reviewer: submission.creator_id === user.id,
        is_submitter: submission.user_id === user.id
      };

      return NextResponse.json({
        success: true,
        review: reviewData
      });

    } catch (error) {
      console.error('Get review error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch review' },
        { status: 500 }
      );
    }
  });
}