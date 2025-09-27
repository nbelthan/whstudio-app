/**
 * World ID Verification endpoint
 * Handles World ID proof verification, nullifier validation, and user creation
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyWorldIdProof, handleWorldIdVerification } from '@/lib/world-verify';
import { executeQuery, withTransaction } from '@/lib/db';
import { createSession, getSessionCookieConfig } from '@/lib/session';

// Use Edge Runtime for faster cold starts
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

interface VerifyRequest {
  action_id: string;
  nullifier_hash: string;
  merkle_root: string;
  proof: string;
  verification_level?: 'orb' | 'device';
  signal?: string;
  user_info?: {
    username?: string;
    wallet_address?: string;
    profile_image_url?: string;
  };
}

/**
 * Verify World ID proof and create/update user session
 */
export async function POST(req: NextRequest) {
  try {
    const {
      action_id,
      nullifier_hash,
      merkle_root,
      proof,
      verification_level = 'orb',
      signal,
      user_info
    }: VerifyRequest = await req.json();

    // Validate required fields
    if (!action_id || !nullifier_hash || !merkle_root || !proof) {
      return NextResponse.json(
        { error: 'Missing required verification data' },
        { status: 400 }
      );
    }

    // Validate action_id format
    if (!/^[a-z0-9_-]+$/.test(action_id) || action_id.length < 3 || action_id.length > 50) {
      return NextResponse.json(
        { error: 'Invalid action_id format' },
        { status: 400 }
      );
    }

    // Rate limiting check
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] ||
                     req.headers.get('x-real-ip') ||
                     req.ip ||
                     'unknown';

    // Check for recent verification attempts from this IP/nullifier
    const recentAttempts = await executeQuery<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM user_sessions
       WHERE nullifier_hash = $1
       AND created_at > CURRENT_TIMESTAMP - INTERVAL '15 minutes'`,
      [nullifier_hash]
    );

    const attemptCount = parseInt(recentAttempts.rows[0]?.count || '0');
    if (attemptCount >= 5) {
      return NextResponse.json(
        {
          error: 'Too many verification attempts',
          retry_after: 900 // 15 minutes in seconds
        },
        { status: 429 }
      );
    }

    // Development mode bypass
    const isDevelopment = process.env.NODE_ENV === 'development' ||
                         process.env.NEXT_PUBLIC_DEVELOPMENT_MODE === 'true';

    let verificationResult;

    if (isDevelopment) {
      console.log('Development mode: Bypassing World ID cloud verification');
      verificationResult = { success: true };
    } else {
      // Verify proof with Worldcoin cloud API
      verificationResult = await verifyWorldIdProof(
        {
          nullifier_hash,
          merkle_root,
          proof,
          verification_level
        },
        action_id
      );

      if (!verificationResult.success) {
        return NextResponse.json(
          {
            error: 'World ID verification failed',
            details: verificationResult.error
          },
          { status: 400 }
        );
      }
    }

    // Check if nullifier has been used before (sybil protection)
    const existingUser = await executeQuery<{
      id: string;
      world_id: string;
      verification_level: string;
      is_active: boolean;
    }>(
      `SELECT id, world_id, verification_level, is_active
       FROM users
       WHERE nullifier_hash = $1
       LIMIT 1`,
      [nullifier_hash]
    );

    let user;
    let isNewUser = false;
    let sessionToken;

    if (existingUser.rows.length > 0) {
      // Existing user
      user = existingUser.rows[0];

      // Check if user is active
      if (!user.is_active) {
        return NextResponse.json(
          { error: 'Account is disabled' },
          { status: 403 }
        );
      }

      // Update user information if provided
      if (user_info && Object.keys(user_info).length > 0) {
        const updateResult = await executeQuery(
          `UPDATE users
           SET wallet_address = COALESCE($1, wallet_address),
               username = COALESCE($2, username),
               profile_image_url = COALESCE($3, profile_image_url),
               verification_level = $4,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $5
           RETURNING *`,
          [
            user_info.wallet_address,
            user_info.username,
            user_info.profile_image_url,
            verification_level,
            user.id
          ]
        );

        user = updateResult.rows[0];
      }

      // Create session for existing user
      sessionToken = await createSession(
        user.world_id,
        nullifier_hash,
        {
          userAgent: req.headers.get('user-agent') || 'MiniKit',
          platform: 'World App',
          ipAddress: clientIP
        }
      );
    } else {
      // New user - create account
      isNewUser = true;

      const result = await withTransaction(async (client) => {
        // Generate world_id from nullifier hash
        const worldId = `world_${nullifier_hash.slice(2, 18)}`;

        // Create new user
        const newUserResult = await client.query(
          `INSERT INTO users
           (world_id, nullifier_hash, verification_level, wallet_address, username, profile_image_url)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            worldId,
            nullifier_hash,
            verification_level,
            user_info?.wallet_address || null,
            user_info?.username || null,
            user_info?.profile_image_url || null
          ]
        );

        const newUser = newUserResult.rows[0];

        // Create session for new user
        const newSessionToken = await createSession(
          worldId,
          nullifier_hash,
          {
            userAgent: req.headers.get('user-agent') || 'MiniKit',
            platform: 'World App',
            ipAddress: clientIP
          }
        );

        return {
          user: newUser,
          sessionToken: newSessionToken
        };
      });

      user = result.user;
      sessionToken = result.sessionToken;
    }

    // Set session cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        world_id: user.world_id,
        nullifier_hash: user.nullifier_hash,
        verification_level: user.verification_level,
        username: user.username,
        wallet_address: user.wallet_address,
        reputation_score: user.reputation_score || 0,
        total_earned: user.total_earned || 0,
        is_new_user: isNewUser
      },
      session_token: sessionToken,
      verification: {
        action_id,
        verification_level,
        verified_at: new Date().toISOString()
      }
    });

    // Set session cookie
    const cookieConfig = getSessionCookieConfig(sessionToken);
    response.cookies.set(cookieConfig.name, cookieConfig.value, {
      httpOnly: cookieConfig.httpOnly,
      secure: cookieConfig.secure,
      sameSite: cookieConfig.sameSite,
      maxAge: cookieConfig.maxAge,
      path: cookieConfig.path
    });

    return response;

  } catch (error) {
    console.error('World ID verification error:', error);
    return NextResponse.json(
      { error: 'Verification process failed' },
      { status: 500 }
    );
  }
}

/**
 * Check verification status for a given nullifier
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const nullifier_hash = searchParams.get('nullifier_hash');
    const action_id = searchParams.get('action_id');

    if (!nullifier_hash) {
      return NextResponse.json(
        { error: 'nullifier_hash parameter is required' },
        { status: 400 }
      );
    }

    // Check if nullifier exists in database
    const user = await executeQuery<{
      id: string;
      world_id: string;
      verification_level: string;
      is_active: boolean;
      created_at: string;
    }>(
      `SELECT id, world_id, verification_level, is_active, created_at
       FROM users
       WHERE nullifier_hash = $1
       LIMIT 1`,
      [nullifier_hash]
    );

    if (user.rows.length === 0) {
      return NextResponse.json({
        verified: false,
        exists: false,
        message: 'Nullifier not found'
      });
    }

    const userData = user.rows[0];

    // Check if user has active session
    const activeSession = await executeQuery<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM user_sessions
       WHERE nullifier_hash = $1
       AND is_active = true
       AND expires_at > CURRENT_TIMESTAMP`,
      [nullifier_hash]
    );

    const hasActiveSession = parseInt(activeSession.rows[0]?.count || '0') > 0;

    return NextResponse.json({
      verified: true,
      exists: true,
      user: {
        id: userData.id,
        world_id: userData.world_id,
        verification_level: userData.verification_level,
        is_active: userData.is_active,
        verified_at: userData.created_at
      },
      has_active_session: hasActiveSession,
      can_access_orb: userData.verification_level === 'orb',
      can_access_device: true
    });

  } catch (error) {
    console.error('Verification status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check verification status' },
      { status: 500 }
    );
  }
}