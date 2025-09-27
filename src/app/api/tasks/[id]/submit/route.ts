/**
 * Task submission API endpoint (Demo Mode)
 * Mock implementation for demonstration purposes
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

/**
 * Submit work for a task (Demo Mode)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const submissionData = await req.json();

    console.log('🔍 Submission API: Request for task ID:', taskId);
    console.log('🔍 Submission API: Submission data:', submissionData);

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

    // For demo mode, validate basic RLHF submission structure
    const { chosen_response, confidence, time_spent_seconds } = submissionData.submission_data;

    // Validate chosen_response is either "A" or "B" (case-insensitive)
    const normalizedResponse = chosen_response?.toUpperCase();
    if (!normalizedResponse || (normalizedResponse !== 'A' && normalizedResponse !== 'B')) {
      return NextResponse.json(
        { error: 'For A/B tasks, chosen_response must be either "A" or "B"' },
        { status: 400 }
      );
    }

    // Create mock submission for demo
    const mockSubmission = {
      id: randomUUID(),
      task_id: taskId,
      status: 'pending',
      time_spent_minutes: time_spent_seconds ? Math.ceil(time_spent_seconds / 60) : 5,
      created_at: new Date().toISOString()
    };

    console.log('🔍 Submission API: Created mock submission:', mockSubmission);

    return NextResponse.json({
      success: true,
      submission: mockSubmission,
      message: 'Submission created successfully. Thank you for contributing to RLHF!'
    });

  } catch (error) {
    console.error('Submission error:', error);
    return NextResponse.json(
      { error: 'Failed to create submission' },
      { status: 500 }
    );
  }
}

/**
 * Get submission details for a task (Demo Mode)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;

    console.log('🔍 Submission GET API: Request for task ID:', taskId);

    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      );
    }

    // For demo mode, return no existing submissions
    return NextResponse.json({
      success: true,
      submissions: [],
      total_count: 0,
      message: 'No submissions found (demo mode)'
    });

  } catch (error) {
    console.error('Submission fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}