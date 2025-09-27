/**
 * User profile management API
 * Handles profile updates and retrieval for authenticated users
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, withAuth } from '@/lib/session';
import { queries } from '@/lib/db';

/**
 * Get current user profile
 */
export async function GET() {
  return withAuth(async (user) => {
    return NextResponse.json({
      success: true,
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
  });
}

/**
 * Update user profile
 */
export async function PUT(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const updates = await req.json();

      // Validate updates
      const allowedFields = ['username', 'profile_image_url', 'bio'];
      const filteredUpdates: any = {};

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          filteredUpdates[field] = updates[field];
        }
      }

      // Validate username if provided
      if (filteredUpdates.username) {
        if (typeof filteredUpdates.username !== 'string' ||
            filteredUpdates.username.length < 3 ||
            filteredUpdates.username.length > 30) {
          return NextResponse.json(
            { error: 'Username must be between 3 and 30 characters' },
            { status: 400 }
          );
        }

        // Check for alphanumeric and underscores only
        if (!/^[a-zA-Z0-9_]+$/.test(filteredUpdates.username)) {
          return NextResponse.json(
            { error: 'Username can only contain letters, numbers, and underscores' },
            { status: 400 }
          );
        }

        // Check if username is already taken
        const existingUser = await queries.users.findByWorldId(filteredUpdates.username);
        if (existingUser.length > 0 && existingUser[0].id !== user.id) {
          return NextResponse.json(
            { error: 'Username is already taken' },
            { status: 409 }
          );
        }
      }

      // Validate bio length
      if (filteredUpdates.bio && filteredUpdates.bio.length > 500) {
        return NextResponse.json(
          { error: 'Bio must be less than 500 characters' },
          { status: 400 }
        );
      }

      // Validate profile image URL
      if (filteredUpdates.profile_image_url) {
        try {
          new URL(filteredUpdates.profile_image_url);
        } catch {
          return NextResponse.json(
            { error: 'Invalid profile image URL' },
            { status: 400 }
          );
        }
      }

      if (Object.keys(filteredUpdates).length === 0) {
        return NextResponse.json(
          { error: 'No valid fields to update' },
          { status: 400 }
        );
      }

      // Update profile
      const updatedUsers = await queries.users.updateProfile(user.id, filteredUpdates);

      if (updatedUsers.length === 0) {
        throw new Error('Failed to update profile');
      }

      const updatedUser = updatedUsers[0];

      return NextResponse.json({
        success: true,
        user: {
          id: updatedUser.id,
          world_id: updatedUser.world_id,
          username: updatedUser.username,
          profile_image_url: updatedUser.profile_image_url,
          bio: updatedUser.bio,
          reputation_score: updatedUser.reputation_score,
          total_earned: updatedUser.total_earned,
          verification_level: updatedUser.verification_level,
          updated_at: updatedUser.updated_at
        }
      });

    } catch (error) {
      console.error('Profile update error:', error);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }
  });
}