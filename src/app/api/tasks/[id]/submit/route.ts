/**
 * Task submission API endpoint
 * Handles submission creation with sybil resistance
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/session';
import { queries } from '@/lib/db';
import { verifyWorldIDProof, actions } from '@/lib/world-verify';

/**
 * Submit work for a task
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    try {
      const { id: taskId } = await params;
      const submissionData = await req.json();

      if (!taskId || typeof taskId !== 'string') {
        return NextResponse.json(
          { error: 'Invalid task ID' },
          { status: 400 }
        );
      }

      // Validate required fields
      if (!submissionData.submission_data) {
        return NextResponse.json(
          { error: 'Missing submission data' },
          { status: 400 }
        );
      }

      // Get task details
      const tasks = await queries.tasks.findById(taskId);

      if (tasks.length === 0) {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        );
      }

      const task = tasks[0];

      // Check task status and expiration
      if (task.status !== 'active') {
        return NextResponse.json(
          { error: 'Task is not accepting submissions' },
          { status: 403 }
        );
      }

      if (task.expires_at && new Date(task.expires_at) <= new Date()) {
        return NextResponse.json(
          { error: 'Task has expired' },
          { status: 410 }
        );
      }

      // Check if user is the task creator
      if (task.creator_id === user.id) {
        return NextResponse.json(
          { error: 'Cannot submit to your own task' },
          { status: 403 }
        );
      }

      // Check for existing submission
      const existingSubmissions = await queries.submissions.findByTask(taskId);
      const userSubmission = existingSubmissions.find((sub: any) => sub.user_id === user.id);

      if (userSubmission) {
        return NextResponse.json(
          { error: 'You have already submitted to this task' },
          { status: 409 }
        );
      }

      // Check submission limit
      if (existingSubmissions.length >= task.max_submissions) {
        return NextResponse.json(
          { error: 'Task has reached maximum submissions' },
          { status: 410 }
        );
      }

      // Sybil resistance: verify nullifier hasn't been used for this task
      const nullifierSubmission = existingSubmissions.find((sub: any) =>
        sub.submitter_nullifier === user.nullifier_hash
      );

      if (nullifierSubmission) {
        return NextResponse.json(
          { error: 'This nullifier has already been used for this task' },
          { status: 409 }
        );
      }

      // If task requires verification, validate World ID proof
      if (task.requires_verification && submissionData.world_id_proof) {
        const verificationResult = await verifyWorldIDProof(
          submissionData.world_id_proof,
          actions.SUBMIT_TASK,
          `task_${taskId}_${user.id}`
        );

        if (!verificationResult.success) {
          return NextResponse.json(
            { error: 'World ID verification failed for submission' },
            { status: 400 }
          );
        }

        // Ensure the proof matches the user's nullifier
        if (verificationResult.data?.nullifier_hash !== user.nullifier_hash) {
          return NextResponse.json(
            { error: 'World ID proof does not match user identity' },
            { status: 403 }
          );
        }
      }

      // Validate submission data structure based on task type
      if (typeof submissionData.submission_data !== 'object') {
        return NextResponse.json(
          { error: 'Submission data must be an object' },
          { status: 400 }
        );
      }

      // Special validation for pairwise A/B preference tasks (MT-Bench)
      if (task.task_type === 'pairwise_ab' || (task.instructions && typeof task.instructions === 'object' && task.instructions.type === 'pairwise_ab')) {
        const { chosen_response, confidence, time_spent_seconds } = submissionData.submission_data;

        // Validate chosen_response is either "A" or "B"
        if (!chosen_response || (chosen_response !== 'A' && chosen_response !== 'B')) {
          return NextResponse.json(
            { error: 'For A/B tasks, chosen_response must be either "A" or "B"' },
            { status: 400 }
          );
        }

        // Validate confidence score (0-1)
        if (confidence !== undefined && (typeof confidence !== 'number' || confidence < 0 || confidence > 1)) {
          return NextResponse.json(
            { error: 'Confidence must be a number between 0 and 1' },
            { status: 400 }
          );
        }

        // Validate time spent in seconds
        if (time_spent_seconds !== undefined && (typeof time_spent_seconds !== 'number' || time_spent_seconds <= 0)) {
          return NextResponse.json(
            { error: 'Time spent must be a positive number in seconds' },
            { status: 400 }
          );
        }
      }

      // Validate time spent (for backwards compatibility)
      let timeSpent = submissionData.time_spent_minutes;
      if (timeSpent && (!Number.isInteger(timeSpent) || timeSpent <= 0)) {
        return NextResponse.json(
          { error: 'Time spent must be a positive integer' },
          { status: 400 }
        );
      }

      // Create submission
      const newSubmission = {
        task_id: taskId,
        user_id: user.id,
        submitter_nullifier: user.nullifier_hash,
        submission_data: submissionData.submission_data,
        attachments_urls: submissionData.attachments_urls || [],
        time_spent_minutes: timeSpent || null
      };

      const createdSubmissions = await queries.submissions.create(newSubmission);

      if (createdSubmissions.length === 0) {
        throw new Error('Failed to create submission');
      }

      const submission = createdSubmissions[0];

      // TODO: Trigger notification to task creator
      // TODO: If task has auto-approval criteria, check and approve automatically

      return NextResponse.json({
        success: true,
        submission: {
          id: submission.id,
          task_id: submission.task_id,
          status: submission.status,
          time_spent_minutes: submission.time_spent_minutes,
          created_at: submission.created_at
        },
        message: 'Submission created successfully. Awaiting review.'
      });

    } catch (error) {
      console.error('Submission error:', error);
      return NextResponse.json(
        { error: 'Failed to create submission' },
        { status: 500 }
      );
    }
  });
}

/**
 * Get submission details for a task (submitter or task creator only)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    try {
      const { id: taskId } = await params;

      if (!taskId || typeof taskId !== 'string') {
        return NextResponse.json(
          { error: 'Invalid task ID' },
          { status: 400 }
        );
      }

      // Get task to check permissions
      const tasks = await queries.tasks.findById(taskId);

      if (tasks.length === 0) {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        );
      }

      const task = tasks[0];
      const isCreator = task.creator_id === user.id;

      // Get submissions
      const submissions = await queries.submissions.findByTask(taskId);

      if (!isCreator) {
        // Non-creators can only see their own submission
        const userSubmission = submissions.find((sub: any) => sub.user_id === user.id);

        if (!userSubmission) {
          return NextResponse.json(
            { error: 'No submission found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          submission: {
            id: userSubmission.id,
            task_id: userSubmission.task_id,
            submission_data: userSubmission.submission_data,
            attachments_urls: userSubmission.attachments_urls,
            time_spent_minutes: userSubmission.time_spent_minutes,
            quality_score: userSubmission.quality_score,
            status: userSubmission.status,
            review_notes: userSubmission.review_notes,
            created_at: userSubmission.created_at,
            reviewed_at: userSubmission.reviewed_at
          }
        });
      } else {
        // Creators can see all submissions
        const submissionList = submissions.map((sub: any) => ({
          id: sub.id,
          submitter_username: sub.submitter_username,
          submission_data: sub.submission_data,
          attachments_urls: sub.attachments_urls,
          time_spent_minutes: sub.time_spent_minutes,
          quality_score: sub.quality_score,
          status: sub.status,
          review_notes: sub.review_notes,
          created_at: sub.created_at,
          reviewed_at: sub.reviewed_at
        }));

        return NextResponse.json({
          success: true,
          submissions: submissionList,
          total_count: submissionList.length
        });
      }

    } catch (error) {
      console.error('Submission fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch submissions' },
        { status: 500 }
      );
    }
  });
}