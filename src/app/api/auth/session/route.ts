/**
 * Session validation API endpoint
 * Validates current session and returns user data
 */

import { NextResponse } from 'next/server';
import { getCurrentUser, refreshSession } from '@/lib/auth/session';

/**
 * Get current session info
 */
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        world_id: user.world_id,
        username: user.username,
        profile_image_url: user.profile_image_url,
        bio: user.bio,
        reputation_score: user.reputation_score,
        total_earned: user.total_earned,
        verification_level: user.verification_level,
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { error: 'Failed to validate session' },
      { status: 500 }
    );
  }
}

/**
 * Refresh current session
 */
export async function POST() {
  try {
    const refreshed = await refreshSession();

    if (!refreshed) {
      return NextResponse.json(
        { error: 'Failed to refresh session' },
        { status: 401 }
      );
    }

    const user = await getCurrentUser();

    return NextResponse.json({
      success: true,
      refreshed: true,
      user: user ? {
        id: user.id,
        world_id: user.world_id,
        username: user.username,
        profile_image_url: user.profile_image_url,
        bio: user.bio,
        reputation_score: user.reputation_score,
        total_earned: user.total_earned,
        verification_level: user.verification_level
      } : null
    });

  } catch (error) {
    console.error('Session refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh session' },
      { status: 500 }
    );
  }
}