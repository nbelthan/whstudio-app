/**
 * World ID Authentication Handshake endpoint
 * Handles initial authentication flow and session creation
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { createSession, getSessionCookieConfig } from '@/lib/session';
import { checkMiniKitStatus } from '@/lib/world-verify';

// Use Edge Runtime for faster cold starts
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

interface HandshakeRequest {
  world_id?: string;
  nullifier_hash?: string;
  device_info?: {
    userAgent?: string;
    platform?: string;
    ipAddress?: string;
  };
}

/**
 * Initialize authentication handshake
 * Creates a session for an existing verified user or initiates verification flow
 */
export async function POST(req: NextRequest) {
  try {
    const { world_id, nullifier_hash, device_info }: HandshakeRequest = await req.json();

    // Check MiniKit availability
    const miniKitStatus = checkMiniKitStatus();
    if (!miniKitStatus.available) {
      return NextResponse.json(
        {
          error: 'MiniKit not available',
          requiresWorldApp: true,
          details: 'Please open this app in World App to continue'
        },
        { status: 400 }
      );
    }

    // Get client IP address for device info
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] ||
                     req.headers.get('x-real-ip') ||
                     req.ip ||
                     'unknown';

    const enhancedDeviceInfo = {
      ...device_info,
      ipAddress: clientIP,
      userAgent: req.headers.get('user-agent') || device_info?.userAgent,
      platform: 'World App'
    };

    // If nullifier_hash is provided, check if user exists and create session
    if (nullifier_hash) {
      const existingUser = await executeQuery<{
        id: string;
        world_id: string;
        nullifier_hash: string;
        is_active: boolean;
        verification_level: string;
      }>(
        `SELECT id, world_id, nullifier_hash, is_active, verification_level
         FROM users
         WHERE nullifier_hash = $1
         LIMIT 1`,
        [nullifier_hash]
      );

      if (existingUser.rows.length > 0) {
        const user = existingUser.rows[0];

        // Check if user is active
        if (!user.is_active) {
          return NextResponse.json(
            { error: 'Account is disabled' },
            { status: 403 }
          );
        }

        // Create session for existing user
        const sessionToken = await createSession(
          user.world_id,
          user.nullifier_hash,
          enhancedDeviceInfo
        );

        // Set session cookie
        const response = NextResponse.json({
          success: true,
          user: {
            id: user.id,
            world_id: user.world_id,
            verification_level: user.verification_level,
            is_returning_user: true
          },
          session_token: sessionToken,
          requires_verification: false
        });

        const cookieConfig = getSessionCookieConfig(sessionToken);
        response.cookies.set(cookieConfig.name, cookieConfig.value, {
          httpOnly: cookieConfig.httpOnly,
          secure: cookieConfig.secure,
          sameSite: cookieConfig.sameSite,
          maxAge: cookieConfig.maxAge,
          path: cookieConfig.path
        });

        return response;
      }
    }

    // If world_id is provided, check if user exists
    if (world_id) {
      const existingUser = await executeQuery<{
        id: string;
        world_id: string;
        nullifier_hash: string;
        is_active: boolean;
        verification_level: string;
      }>(
        `SELECT id, world_id, nullifier_hash, is_active, verification_level
         FROM users
         WHERE world_id = $1
         LIMIT 1`,
        [world_id]
      );

      if (existingUser.rows.length > 0) {
        const user = existingUser.rows[0];

        if (!user.is_active) {
          return NextResponse.json(
            { error: 'Account is disabled' },
            { status: 403 }
          );
        }

        // Return user info without session (still needs verification)
        return NextResponse.json({
          success: true,
          user: {
            id: user.id,
            world_id: user.world_id,
            verification_level: user.verification_level,
            is_returning_user: true
          },
          requires_verification: true,
          verification_action: 'worldhuman-login'
        });
      }
    }

    // New user - needs verification
    return NextResponse.json({
      success: true,
      user: null,
      requires_verification: true,
      verification_action: 'worldhuman-onboard',
      is_new_user: true,
      minikit_status: miniKitStatus
    });

  } catch (error) {
    console.error('Authentication handshake error:', error);
    return NextResponse.json(
      { error: 'Authentication handshake failed' },
      { status: 500 }
    );
  }
}

/**
 * Get current authentication status
 * Returns session information if user is authenticated
 */
export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('session');

    if (!sessionCookie) {
      return NextResponse.json({
        authenticated: false,
        requires_verification: true
      });
    }

    // Import session functions here to avoid edge runtime issues
    const { getSession } = await import('@/lib/session');
    const session = await getSession(sessionCookie.value);

    if (!session) {
      return NextResponse.json({
        authenticated: false,
        requires_verification: true,
        session_expired: true
      });
    }

    // Get user details from database
    const user = await executeQuery<{
      id: string;
      world_id: string;
      nullifier_hash: string;
      verification_level: string;
      username: string;
      wallet_address: string;
      reputation_score: number;
      total_earned: number;
      is_active: boolean;
    }>(
      `SELECT id, world_id, nullifier_hash, verification_level, username,
              wallet_address, reputation_score, total_earned, is_active
       FROM users
       WHERE nullifier_hash = $1 AND is_active = true
       LIMIT 1`,
      [session.nullifierHash]
    );

    if (user.rows.length === 0) {
      return NextResponse.json({
        authenticated: false,
        requires_verification: true,
        user_not_found: true
      });
    }

    const userData = user.rows[0];

    return NextResponse.json({
      authenticated: true,
      user: {
        id: userData.id,
        world_id: userData.world_id,
        verification_level: userData.verification_level,
        username: userData.username,
        wallet_address: userData.wallet_address,
        reputation_score: userData.reputation_score,
        total_earned: userData.total_earned
      },
      session: {
        created_at: session.createdAt,
        last_accessed_at: session.lastAccessedAt
      }
    });

  } catch (error) {
    console.error('Authentication status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check authentication status' },
      { status: 500 }
    );
  }
}

/**
 * Logout and invalidate session
 */
export async function DELETE(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('session');

    if (sessionCookie) {
      // Import session functions here to avoid edge runtime issues
      const { getSession, invalidateSession, getClearSessionCookieConfig } = await import('@/lib/session');
      const session = await getSession(sessionCookie.value);

      if (session) {
        await invalidateSession(session.sessionId);
      }
    }

    // Clear session cookie
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    const { getClearSessionCookieConfig } = await import('@/lib/session');
    const clearCookieConfig = getClearSessionCookieConfig();
    response.cookies.set(clearCookieConfig.name, clearCookieConfig.value, {
      httpOnly: clearCookieConfig.httpOnly,
      secure: clearCookieConfig.secure,
      sameSite: clearCookieConfig.sameSite,
      maxAge: clearCookieConfig.maxAge,
      path: clearCookieConfig.path
    });

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}