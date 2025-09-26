/**
 * Logout API endpoint
 * Handles user session termination and cleanup
 */

import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth/session';

/**
 * Logout user and clear session
 */
export async function POST() {
  try {
    await deleteSession();

    return NextResponse.json({
      success: true,
      message: 'Successfully logged out'
    });

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}