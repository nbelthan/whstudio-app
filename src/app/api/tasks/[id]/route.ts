/**
 * Individual task API endpoints (Demo Mode)
 * Uses mock data for demonstration
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// Function to generate consistent UUIDs from string seeds (same as main route)
function generateUUID(seed: string): string {
  const seedNum = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hex = (seedNum * 123456789).toString(16).padStart(8, '0').slice(0, 8);
  return `${hex.slice(0, 8)}-${hex.slice(0, 4)}-4${hex.slice(1, 4)}-8${hex.slice(0, 3)}-${hex.slice(0, 12)}`;
}

// Mock task data (duplicated from main route to keep consistency)
const getMockTaskById = (id: string) => {
  // Generate the same task structure as the main route
  const allMockTasks = [];

  // Add the first 3 tasks
  const baseTasks = [
    {
      id: generateUUID("mt-bench-001"),
      title: "A/B Preference – MTBench #150",
      description: "Compare two AI-generated creative stories and choose which one is better",
      task_type: "pairwise_ab",
      instructions: "Compare the two AI responses and select which one is higher quality based on creativity, coherence, and engagement.",
      reward_amount: 0.02,
      reward_currency: "USDC",
      max_submissions: 100,
      difficulty_level: 3,
      estimated_time_minutes: 5,
      category_name: "RLHF Rating",
      created_at: new Date(Date.now() - 86400000).toISOString(),
      expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
      user_has_submitted: false,
      status: "active",
      priority: 1
    },
    {
      id: generateUUID("mt-bench-002"),
      title: "A/B Preference – MTBench #151",
      description: "Compare two AI-generated explanations of a complex topic and choose the clearer one",
      task_type: "pairwise_ab",
      instructions: "Evaluate which explanation is more clear, accurate, and helpful for understanding the topic.",
      reward_amount: 0.02,
      reward_currency: "USDC",
      max_submissions: 100,
      difficulty_level: 2,
      estimated_time_minutes: 4,
      category_name: "RLHF Rating",
      created_at: new Date(Date.now() - 43200000).toISOString(),
      expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
      user_has_submitted: false,
      status: "active",
      priority: 2
    },
    {
      id: generateUUID("mt-bench-003"),
      title: "A/B Preference – MTBench #152",
      description: "Compare two AI-generated code solutions and choose the better implementation",
      task_type: "pairwise_ab",
      instructions: "Evaluate code quality, efficiency, readability, and correctness to determine the superior solution.",
      reward_amount: 0.02,
      reward_currency: "USDC",
      max_submissions: 100,
      difficulty_level: 4,
      estimated_time_minutes: 8,
      category_name: "RLHF Rating",
      created_at: new Date(Date.now() - 21600000).toISOString(),
      expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
      user_has_submitted: false,
      status: "active",
      priority: 3
    }
  ];

  allMockTasks.push(...baseTasks);

  // Generate additional tasks (4-60)
  const topics = [
    "Creative Writing", "Technical Explanation", "Code Review", "Problem Solving",
    "Data Analysis", "Research Summary", "Translation", "Content Moderation",
    "Mathematical Reasoning", "Logical Reasoning"
  ];

  for (let i = 4; i <= 60; i++) {
    const topic = topics[i % topics.length];
    allMockTasks.push({
      id: generateUUID(`mt-bench-${i.toString().padStart(3, '0')}`),
      title: `A/B Preference – MTBench #${149 + i}`,
      description: `Compare two AI responses for ${topic.toLowerCase()} and choose the better one`,
      task_type: "pairwise_ab",
      instructions: `Evaluate the quality, accuracy, and helpfulness of both responses for this ${topic.toLowerCase()} task.`,
      reward_amount: 0.02,
      reward_currency: "USDC",
      max_submissions: 100,
      difficulty_level: Math.floor(Math.random() * 5) + 1,
      estimated_time_minutes: Math.floor(Math.random() * 8) + 3,
      category_name: "RLHF Rating",
      created_at: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
      expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
      user_has_submitted: false,
      status: "active",
      priority: i
    });
  }

  return allMockTasks.find(task => task.id === id);
};

/**
 * Get task by ID with submission details (Demo Mode)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log('🔍 Task by ID API: Request for ID:', id);

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      );
    }

    // Get task from mock data
    const task = getMockTaskById(id);

    if (!task) {
      console.log('🔍 Task by ID API: Task not found for ID:', id);
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    console.log('🔍 Task by ID API: Found task:', task.title);

    // Check if task is accessible
    if (task.status !== 'active' && task.status !== 'completed') {
      return NextResponse.json(
        { error: 'Task is not available' },
        { status: 403 }
      );
    }

    // For demo mode, simulate no user submissions
    const response = {
      ...task,
      creator_username: 'WorldHuman Studio',
      user_has_submitted: false,
      user_submission: null,
      is_creator: false,
      submissions: []
    };

    return NextResponse.json({
      success: true,
      task: response
    });

  } catch (error) {
    console.error('Task fetch error:', error);
    return NextResponse.json(
      { error: `Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

/**
 * Update task (creator only)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    try {
      const { id } = await params;
      const updates = await req.json();

      if (!id || typeof id !== 'string') {
        return NextResponse.json(
          { error: 'Invalid task ID' },
          { status: 400 }
        );
      }

      // Get task to verify ownership
      const tasks = await queries.tasks.findById(id);

      if (tasks.length === 0) {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        );
      }

      const task = tasks[0];

      if (task.creator_id !== user.id) {
        return NextResponse.json(
          { error: 'Only task creator can update this task' },
          { status: 403 }
        );
      }

      // Validate updateable fields
      const allowedFields = [
        'title', 'description', 'instructions', 'status',
        'priority', 'expires_at', 'max_submissions'
      ];

      const filteredUpdates: any = {};
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          filteredUpdates[field] = updates[field];
        }
      }

      if (Object.keys(filteredUpdates).length === 0) {
        return NextResponse.json(
          { error: 'No valid fields to update' },
          { status: 400 }
        );
      }

      // Update the task
      const updateResult = await queries.tasks.update(id, filteredUpdates);

      if (updateResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Failed to update task' },
          { status: 500 }
        );
      }

      const updatedTask = updateResult.rows[0];

      return NextResponse.json({
        success: true,
        message: 'Task updated successfully',
        task: updatedTask,
        updated_fields: Object.keys(filteredUpdates)
      });

    } catch (error) {
      console.error('Task update error:', error);
      return NextResponse.json(
        { error: 'Failed to update task' },
        { status: 500 }
      );
    }
  });
}

/**
 * Delete task (creator only)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    try {
      const { id } = await params;

      if (!id || typeof id !== 'string') {
        return NextResponse.json(
          { error: 'Invalid task ID' },
          { status: 400 }
        );
      }

      // Get task to verify ownership
      const tasks = await queries.tasks.findById(id);

      if (tasks.length === 0) {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        );
      }

      const task = tasks[0];

      if (task.creator_id !== user.id) {
        return NextResponse.json(
          { error: 'Only task creator can delete this task' },
          { status: 403 }
        );
      }

      // Check if task has active submissions
      const submissions = await queries.submissions.findByTask(id);
      const hasActiveSubmissions = submissions.some((sub: any) =>
        sub.status === 'pending' || sub.status === 'under_review'
      );

      if (hasActiveSubmissions) {
        return NextResponse.json(
          { error: 'Cannot delete task with pending submissions. Please review them first.' },
          { status: 409 }
        );
      }

      // Delete the task
      const deleteResult = await queries.tasks.delete(id);

      if (deleteResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Failed to delete task' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Task deleted successfully',
        deleted_task: deleteResult.rows[0]
      });

    } catch (error) {
      console.error('Task deletion error:', error);
      return NextResponse.json(
        { error: 'Failed to delete task' },
        { status: 500 }
      );
    }
  });
}