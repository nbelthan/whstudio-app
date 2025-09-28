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

// Real MTBench tasks data for demo
const mockTasks = [
  {
    id: generateUUID("mt-bench-150"),
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
    id: generateUUID("mt-bench-151"),
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
    id: generateUUID("mt-bench-106"),
    title: "A/B Preference – MTBench #106",
    description: "Logic problem about comparing costs of fruits",
    task_type: "pairwise_ab",
    instructions: "Each problem consists of three statements. Based on the first two statements, the third statement may be true, false, or uncertain.\n1. Oranges cost more than apples.\n2. Oranges cost less than bananas.\n3. Bananas cost more than apples and bananas cost more than orange.\nIf the first two statements are true, then the third statement is",
    reward_amount: 0.02,
    reward_currency: "USDC",
    max_submissions: 100,
    difficulty_level: 2,
    estimated_time_minutes: 3,
    category_name: "RLHF Rating",
    created_at: new Date(Date.now() - 21600000).toISOString(), // 6 hours ago
    expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
    user_has_submitted: false,
    status: "active",
    priority: 3
  }
];

// Generate more tasks with real MTBench examples
const generateMoreTasks = () => {
  const tasks = [...mockTasks];

  // Additional real MTBench task examples
  const realExamples = [
    { title: "A/B Preference – MTBench #102", desc: "Riddle about the White House location", instruction: "You can see a beautiful red house to your left and a hypnotic greenhouse to your right, an attractive heated pink place in the front. So, where is the White House?" },
    { title: "A/B Preference – MTBench #96", desc: "Explain machine learning to non-technical customers", instruction: "What is a language model? Is it trained using labeled or unlabelled data?" },
    { title: "A/B Preference – MTBench #120", desc: "Mathematical function evaluation", instruction: "Given that f(x) = 4x^3 - 9x - 14, find the value of f(2)." },
    { title: "A/B Preference – MTBench #90", desc: "Grammar correction task", instruction: "Edit the following paragraph to correct any grammatical errors." },
    { title: "A/B Preference – MTBench #138", desc: "Smartphone review analysis", instruction: "Analyze customer reviews for iPhone, Samsung Galaxy, and Google Pixel and provide ratings." },
    { title: "A/B Preference – MTBench #121", desc: "Python programming task", instruction: "Develop a Python program that reads all text files under a directory and returns top-5 words with most occurrences." },
    { title: "A/B Preference – MTBench #134", desc: "Data analysis - identify highest profit", instruction: "Given company data, identify which has the highest profit in 2021 and provide CEO name." },
    { title: "A/B Preference – MTBench #110", desc: "Critical thinking about school bullying", instruction: "Which situation should recess aides report to the principal regarding bullying?" },
    { title: "A/B Preference – MTBench #158", desc: "Philosophy - Socratic method", instruction: "Which methods did Socrates employ to challenge the prevailing thoughts of his time?" },
    { title: "A/B Preference – MTBench #104", desc: "Logic puzzle about siblings", instruction: "David has three sisters. Each of them has one brother. How many brothers does David have?" },
    { title: "A/B Preference – MTBench #117", desc: "Inequality problem", instruction: "How many integers are in the solution of the inequality |x + 5| < 10" },
    { title: "A/B Preference – MTBench #99", desc: "Mathematical proof in poetry", instruction: "As a mathematician-poet, prove the square root of 2 is irrational in less than 10 rhyming lines." },
    { title: "A/B Preference – MTBench #92", desc: "Role-play as Sheldon Cooper", instruction: "Embrace the role of Sheldon from The Big Bang Theory. What is your opinion on hand dryers?" },
    { title: "A/B Preference – MTBench #111", desc: "Triangle area calculation", instruction: "The vertices of a triangle are at points (0, 0), (-1, 1), and (3, 3). What is the area?" },
    { title: "A/B Preference – MTBench #112", desc: "Investment calculation", instruction: "A startup invests $8000 in year 1, then half that amount in year 2. What's the total investment?" }
  ];

  // Add real examples first
  realExamples.forEach((example, i) => {
    tasks.push({
      id: generateUUID(`mt-bench-${(i + 4).toString().padStart(3, '0')}`),
      title: example.title,
      description: example.desc,
      task_type: "pairwise_ab",
      instructions: example.instruction,
      reward_amount: 0.02,
      reward_currency: "USDC",
      max_submissions: 100,
      difficulty_level: (i % 5) + 1,
      estimated_time_minutes: Math.floor(Math.random() * 5) + 3,
      category_name: "RLHF Rating",
      created_at: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
      expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
      user_has_submitted: false,
      status: "active",
      priority: i + 4
    });
  });

  // Generate remaining tasks to reach 60
  const topics = ["Problem Solving", "Creative Writing", "Code Review", "Data Analysis", "Mathematical Reasoning"];
  for (let i = tasks.length + 1; i <= 60; i++) {
    const topic = topics[i % topics.length];
    tasks.push({
      id: generateUUID(`mt-bench-${i.toString().padStart(3, '0')}`),
      title: `A/B Preference – MTBench #${100 + i}`,
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