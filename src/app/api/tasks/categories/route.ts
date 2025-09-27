/**
 * Task Categories API endpoint
 * Returns available task categories with task counts (using mock data for demo)
 */

import { NextResponse } from 'next/server';

/**
 * Get all task categories with task counts
 */
export async function GET() {
  try {
    console.log('🔍 Categories API: Fetching categories');

    // Mock categories for demo
    const categories = [
      {
        id: 'all',
        name: 'All Tasks',
        description: 'All available tasks',
        icon: '📋',
        is_active: true,
        task_count: 60,
        created_at: new Date().toISOString()
      },
      {
        id: 'rlhf-rating',
        name: 'RLHF Rating',
        description: 'Human preference rating tasks for AI alignment',
        icon: '⭐',
        is_active: true,
        task_count: 60,
        created_at: new Date().toISOString()
      },
      {
        id: 'data-annotation',
        name: 'Data Annotation',
        description: 'Image and text annotation tasks',
        icon: '🏷️',
        is_active: true,
        task_count: 0,
        created_at: new Date().toISOString()
      },
      {
        id: 'voice-recording',
        name: 'Voice Recording',
        description: 'Audio recording and transcription tasks',
        icon: '🎤',
        is_active: true,
        task_count: 0,
        created_at: new Date().toISOString()
      }
    ];

    console.log('🔍 Categories API: Returning', categories.length, 'categories');

    return NextResponse.json({
      success: true,
      categories
    });

  } catch (error) {
    console.error('Categories fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}