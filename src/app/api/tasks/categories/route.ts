/**
 * Task Categories API endpoint
 * Returns available task categories with task counts
 */

import { NextResponse } from 'next/server';
import { queries } from '@/lib/db';

/**
 * Get all task categories with task counts
 */
export async function GET() {
  try {
    const categories = await queries.tasks.getCategories();

    // Add an "All Tasks" category at the beginning
    const allTasksCategory = {
      id: 'all',
      name: 'All Tasks',
      description: 'All available tasks',
      icon: '📋',
      is_active: true,
      task_count: categories.reduce((sum: number, cat: any) => sum + parseInt(cat.task_count), 0),
      created_at: new Date().toISOString()
    };

    const categoriesWithAll = [allTasksCategory, ...categories];

    return NextResponse.json({
      success: true,
      categories: categoriesWithAll
    });

  } catch (error) {
    console.error('Categories fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}