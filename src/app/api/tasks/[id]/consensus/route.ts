/**
 * Task consensus API endpoint
 * Returns consensus statistics for A/B preference tasks (MT-Bench)
 */

import { NextRequest, NextResponse } from 'next/server';
import { queries } from '@/lib/db';

/**
 * Get consensus statistics for a task
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;

    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid task ID' },
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

    // Check if task is accessible
    if (task.status !== 'active' && task.status !== 'completed') {
      return NextResponse.json(
        { error: 'Task consensus not available' },
        { status: 403 }
      );
    }

    // Get all submissions for this task
    const submissions = await queries.submissions.findByTask(taskId);

    // Filter for approved submissions only (to avoid counting spam/invalid submissions)
    const validSubmissions = submissions.filter((sub: any) =>
      sub.status === 'approved' || sub.status === 'pending'
    );

    if (validSubmissions.length === 0) {
      return NextResponse.json({
        success: true,
        consensus: {
          total_responses: 0,
          choice_a_count: 0,
          choice_b_count: 0,
          agreement_percentage: 0,
          consensus_choice: null,
          confidence_stats: {
            average_confidence: 0,
            min_confidence: 0,
            max_confidence: 0
          },
          timing_stats: {
            average_time_seconds: 0,
            min_time_seconds: 0,
            max_time_seconds: 0
          }
        }
      });
    }

    // Calculate consensus for A/B tasks
    let choiceACount = 0;
    let choiceBCount = 0;
    let confidenceScores: number[] = [];
    let timingData: number[] = [];

    for (const submission of validSubmissions) {
      try {
        const submissionData = typeof submission.submission_data === 'string'
          ? JSON.parse(submission.submission_data)
          : submission.submission_data;

        if (submissionData?.chosen_response === 'A') {
          choiceACount++;
        } else if (submissionData?.chosen_response === 'B') {
          choiceBCount++;
        }

        // Collect confidence scores
        if (typeof submissionData?.confidence === 'number') {
          confidenceScores.push(submissionData.confidence);
        }

        // Collect timing data (prefer time_spent_seconds, fallback to time_spent_minutes * 60)
        if (typeof submissionData?.time_spent_seconds === 'number') {
          timingData.push(submissionData.time_spent_seconds);
        } else if (typeof submission.time_spent_minutes === 'number') {
          timingData.push(submission.time_spent_minutes * 60);
        }
      } catch (error) {
        console.error('Error parsing submission data:', error);
        // Skip invalid submissions
        continue;
      }
    }

    const totalValidResponses = choiceACount + choiceBCount;

    // Calculate consensus choice and agreement percentage
    let consensusChoice: 'A' | 'B' | null = null;
    let agreementPercentage = 0;

    if (totalValidResponses > 0) {
      if (choiceACount > choiceBCount) {
        consensusChoice = 'A';
        agreementPercentage = (choiceACount / totalValidResponses) * 100;
      } else if (choiceBCount > choiceACount) {
        consensusChoice = 'B';
        agreementPercentage = (choiceBCount / totalValidResponses) * 100;
      } else {
        // Tie - no consensus
        agreementPercentage = 50;
      }
    }

    // Calculate confidence statistics
    const confidenceStats = confidenceScores.length > 0 ? {
      average_confidence: confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length,
      min_confidence: Math.min(...confidenceScores),
      max_confidence: Math.max(...confidenceScores)
    } : {
      average_confidence: 0,
      min_confidence: 0,
      max_confidence: 0
    };

    // Calculate timing statistics
    const timingStats = timingData.length > 0 ? {
      average_time_seconds: timingData.reduce((a, b) => a + b, 0) / timingData.length,
      min_time_seconds: Math.min(...timingData),
      max_time_seconds: Math.max(...timingData)
    } : {
      average_time_seconds: 0,
      min_time_seconds: 0,
      max_time_seconds: 0
    };

    return NextResponse.json({
      success: true,
      consensus: {
        total_responses: totalValidResponses,
        choice_a_count: choiceACount,
        choice_b_count: choiceBCount,
        agreement_percentage: Math.round(agreementPercentage * 100) / 100, // Round to 2 decimal places
        consensus_choice: consensusChoice,
        confidence_stats: {
          average_confidence: Math.round(confidenceStats.average_confidence * 100) / 100,
          min_confidence: confidenceStats.min_confidence,
          max_confidence: confidenceStats.max_confidence
        },
        timing_stats: {
          average_time_seconds: Math.round(timingStats.average_time_seconds * 100) / 100,
          min_time_seconds: timingStats.min_time_seconds,
          max_time_seconds: timingStats.max_time_seconds
        }
      },
      task_info: {
        id: task.id,
        title: task.title,
        task_type: task.task_type,
        status: task.status,
        max_submissions: task.max_submissions
      }
    });

  } catch (error) {
    console.error('Consensus fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consensus data' },
      { status: 500 }
    );
  }
}