import {
  ISuccessResult,
  IVerifyResponse,
  verifyCloudProof,
} from '@worldcoin/minikit-js';
import { NextRequest, NextResponse } from 'next/server';
import { verifyWorldIdProof } from '@/lib/world-verify';
import { queries } from '@/lib/db';
import { createSession } from '@/lib/session';

interface IRequestPayload {
  payload: ISuccessResult;
  action: string;
  signal: string | undefined;
}

/**
 * Enhanced World ID verification with authentication and sybil resistance
 * This route verifies the proof and creates/updates user sessions
 */
export async function POST(req: NextRequest) {
  try {
    const { payload, action, signal } = (await req.json()) as IRequestPayload;
    const app_id = process.env.NEXT_PUBLIC_APP_ID as `app_${string}`;

    // Validate request format - basic validation
    if (!payload || !payload.nullifier_hash || !payload.merkle_root || !payload.proof) {
      return NextResponse.json(
        { error: 'Invalid proof format' },
        { status: 400 }
      );
    }

    // Basic rate limiting could be implemented here in the future
    // For now, we'll rely on Vercel's built-in rate limiting

    // Check if we're in development mode
    const isDevelopment = process.env.NODE_ENV === 'development' ||
                         process.env.NEXT_PUBLIC_DEVELOPMENT_MODE === 'true';

    let verifyRes: IVerifyResponse;

    if (isDevelopment) {
      // In development, accept any valid-looking proof
      console.log('Development mode: Skipping cloud verification for testing');
      verifyRes = {
        success: true,
        code: 'success',
        detail: 'Development mode - verification bypassed',
        attribute: null
      } as IVerifyResponse;
    } else {
      // Production mode - verify proof with World ID
      verifyRes = (await verifyCloudProof(
        payload,
        app_id,
        action,
        signal,
      )) as IVerifyResponse;

      if (!verifyRes.success) {
        return NextResponse.json(
          {
            error: 'World ID verification failed',
            details: verifyRes
          },
          { status: 400 }
        );
      }
    }

    // Check if this nullifier is already in use (sybil protection)
    const existingUsers = await queries.users.findByNullifier(payload.nullifier_hash);

    let user;
    let isNewUser = false;

    if (existingUsers.length === 0) {
      // New user - automatically create account on first verification
      // This allows seamless onboarding without a separate registration step

      // Generate world_id
      const worldId = `world_${payload.nullifier_hash.slice(2, 18)}`;

      const newUsers = await queries.users.create({
        world_id: worldId,
        nullifier_hash: payload.nullifier_hash,
        verification_level: payload.verification_level,
        username: null,
        wallet_address: null
      });

      if (newUsers.length === 0) {
        throw new Error('Failed to create user');
      }

      user = newUsers[0];
      isNewUser = true;
    } else {
      user = existingUsers[0];

      // Check if user is active
      if (!user.is_active) {
        return NextResponse.json(
          { error: 'Account is disabled' },
          { status: 403 }
        );
      }
    }

    // Create session
    const sessionToken = await createSession({
      userId: user.id,
      worldId: user.world_id,
      nullifierHash: user.nullifier_hash,
      verificationLevel: user.verification_level,
      walletAddress: user.wallet_address || undefined,
      username: user.username || undefined
    });

    // Return success response
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        world_id: user.world_id,
        nullifier_hash: user.nullifier_hash,
        verification_level: user.verification_level,
        username: user.username,
        wallet_address: user.wallet_address,
        reputation_score: user.reputation_score,
        total_earned: user.total_earned,
        is_new_user: isNewUser
      },
      session_token: sessionToken,
      verification: verifyRes
    });

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
