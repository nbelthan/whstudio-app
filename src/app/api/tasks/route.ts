/**
 * Minimal Tasks API for RLHF Demo with Mock MT-Bench Data
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// Function to generate consistent UUIDs from string seeds
function generateUUID(seed: string): string {
  // Create a deterministic UUID from seed for consistent results
  const seedNum = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hex = (seedNum * 123456789).toString(16).padStart(8, '0').slice(0, 8);
  return `${hex.slice(0, 8)}-${hex.slice(0, 4)}-4${hex.slice(1, 4)}-8${hex.slice(0, 3)}-${hex.slice(0, 12)}`;
}

// Mock MT-Bench tasks data for demo
const mockTasks = [
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
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    expires_at: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
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
    created_at: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
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
    created_at: new Date(Date.now() - 21600000).toISOString(), // 6 hours ago
    expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
    user_has_submitted: false,
    status: "active",
    priority: 3
  }
];

// Generate more tasks to reach 60 total
const generateMoreTasks = () => {
  const tasks = [...mockTasks];
  const topics = [
    "Creative Writing", "Technical Explanation", "Code Review", "Problem Solving",
    "Data Analysis", "Research Summary", "Translation", "Content Moderation",
    "Mathematical Reasoning", "Logical Reasoning"
  ];

  for (let i = 4; i <= 60; i++) {
    const topic = topics[i % topics.length];
    tasks.push({
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
  return tasks;
};

const allMockTasks = generateMoreTasks();

/**
 * Get tasks list - using mock data for demo
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status') || 'active';

    console.log('🔍 Tasks API: Request params:', { limit, offset, status });

    // Validate parameters
    if (limit > 100 || limit < 1 || offset < 0) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    // Filter tasks by status
    const filteredTasks = allMockTasks.filter(task => task.status === status);

    // Apply pagination
    const paginatedTasks = filteredTasks.slice(offset, offset + limit);

    console.log('🔍 Tasks API: Returning', paginatedTasks.length, 'of', filteredTasks.length, 'total tasks');

    return NextResponse.json({
      success: true,
      tasks: paginatedTasks,
      pagination: {
        limit,
        offset,
        count: paginatedTasks.length,
        total: filteredTasks.length,
        has_more: offset + limit < filteredTasks.length
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