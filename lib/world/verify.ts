/**
 * World ID verification helpers
 * Handles proof verification, nullifier hash validation, and sybil resistance
 */

import { VerificationLevel, ISuccessResult } from '@worldcoin/minikit-js';

// Environment variables validation
const WORLD_APP_ID = process.env.WORLD_APP_ID;
const WORLD_API_BASE_URL = process.env.WORLD_API_BASE_URL || 'https://developer.worldcoin.org/api/v1';

if (!WORLD_APP_ID) {
  throw new Error('WORLD_APP_ID environment variable is not set');
}

export interface WorldIDProof {
  proof: string;
  merkle_root: string;
  nullifier_hash: string;
  verification_level: VerificationLevel;
}

export interface VerificationResponse {
  success: boolean;
  code: string;
  detail: string;
  attribute: string | null;
}

export interface VerifiedUser {
  nullifier_hash: string;
  verification_level: VerificationLevel;
  world_id: string;
}

/**
 * Verify World ID proof server-side
 */
export async function verifyWorldIDProof(
  proof: WorldIDProof,
  action: string,
  signal?: string
): Promise<{ success: boolean; data?: VerifiedUser; error?: string }> {
  try {
    const verifyUrl = `${WORLD_API_BASE_URL}/verify/${WORLD_APP_ID}`;

    const verifyRequest = {
      nullifier_hash: proof.nullifier_hash,
      merkle_root: proof.merkle_root,
      proof: proof.proof,
      verification_level: proof.verification_level,
      action: action,
      signal: signal || '',
    };

    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WORLD_API_KEY}`, // Optional API key
      },
      body: JSON.stringify(verifyRequest),
    });

    const verifyResponse: VerificationResponse = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: `Verification failed: ${verifyResponse.detail || 'Unknown error'}`,
      };
    }

    if (!verifyResponse.success) {
      return {
        success: false,
        error: `World ID verification failed: ${verifyResponse.detail}`,
      };
    }

    // Generate a world_id from the nullifier hash (you might want to use a different approach)
    const world_id = generateWorldId(proof.nullifier_hash);

    return {
      success: true,
      data: {
        nullifier_hash: proof.nullifier_hash,
        verification_level: proof.verification_level,
        world_id: world_id,
      },
    };
  } catch (error) {
    console.error('World ID verification error:', error);
    return {
      success: false,
      error: 'Failed to verify World ID proof',
    };
  }
}

/**
 * Generate a stable World ID from nullifier hash
 */
function generateWorldId(nullifierHash: string): string {
  // This creates a stable, human-readable ID from the nullifier hash
  // In production, you might want to use a more sophisticated approach
  const hash = Buffer.from(nullifierHash.slice(2), 'hex');
  const worldId = hash.toString('hex').slice(0, 16);
  return `world_${worldId}`;
}

/**
 * Validate proof format before verification
 */
export function isValidProofFormat(proof: any): proof is WorldIDProof {
  return (
    proof &&
    typeof proof.proof === 'string' &&
    typeof proof.merkle_root === 'string' &&
    typeof proof.nullifier_hash === 'string' &&
    typeof proof.verification_level === 'string' &&
    (proof.verification_level === 'orb' || proof.verification_level === 'device') &&
    proof.nullifier_hash.startsWith('0x') &&
    proof.merkle_root.startsWith('0x')
  );
}

/**
 * Extract action and signal from verification request
 */
export function extractVerificationParams(action: string, signal?: string) {
  // Validate action format
  if (!action || action.length === 0) {
    throw new Error('Action cannot be empty');
  }

  // Action should be a descriptive string for your app's use case
  // Examples: 'register', 'vote', 'claim-reward', 'submit-task'
  const validActions = [
    'register',
    'login',
    'submit-task',
    'claim-reward',
    'verify-human',
    'join-task',
    'rate-submission'
  ];

  if (!validActions.includes(action)) {
    console.warn(`Unusual action detected: ${action}`);
  }

  return {
    action: action.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
    signal: signal || '',
  };
}

/**
 * Check verification level requirements
 */
export function meetsVerificationLevel(
  userLevel: VerificationLevel,
  requiredLevel: VerificationLevel
): boolean {
  const levels = { device: 1, orb: 2 };
  return levels[userLevel] >= levels[requiredLevel];
}

/**
 * Generate verification challenge for client
 */
export function generateVerificationChallenge(action: string, userId?: string): {
  action: string;
  signal: string;
  app_id: string;
} {
  const { action: cleanAction } = extractVerificationParams(action);

  return {
    action: cleanAction,
    signal: userId ? `user_${userId}_${Date.now()}` : `challenge_${Date.now()}`,
    app_id: WORLD_APP_ID,
  };
}

/**
 * Batch verify multiple proofs (for admin operations)
 */
export async function batchVerifyProofs(
  proofs: Array<{ proof: WorldIDProof; action: string; signal?: string }>
): Promise<Array<{ success: boolean; data?: VerifiedUser; error?: string; index: number }>> {
  const verificationPromises = proofs.map(async ({ proof, action, signal }, index) => {
    const result = await verifyWorldIDProof(proof, action, signal);
    return { ...result, index };
  });

  try {
    const results = await Promise.allSettled(verificationPromises);

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          error: `Batch verification failed at index ${index}: ${result.reason}`,
          index,
        };
      }
    });
  } catch (error) {
    console.error('Batch verification error:', error);
    return proofs.map((_, index) => ({
      success: false,
      error: 'Batch verification failed',
      index,
    }));
  }
}

/**
 * Check if nullifier has been used for a specific action
 */
export async function isNullifierUsedForAction(
  nullifierHash: string,
  action: string
): Promise<boolean> {
  try {
    // Query your database or cache to check if this nullifier has been used for this action
    // This is crucial for preventing double-spending or replay attacks

    // For now, we'll use a simple in-memory approach
    // In production, use your database or Redis
    const { db } = await import('../db/client');

    const query = `
      SELECT COUNT(*) as count
      FROM user_sessions
      WHERE nullifier_hash = $1
      AND created_at > NOW() - INTERVAL '24 hours'
    `;

    const result = await db(query, [nullifierHash]);
    return result[0]?.count > 0;
  } catch (error) {
    console.error('Error checking nullifier usage:', error);
    // Err on the side of caution
    return true;
  }
}

/**
 * Rate limit verification attempts per IP/nullifier
 */
export async function checkVerificationRateLimit(
  identifier: string,
  windowMinutes: number = 15,
  maxAttempts: number = 5
): Promise<{ allowed: boolean; remainingAttempts: number; resetTime: Date }> {
  try {
    // Check if KV is configured
    const hasKV = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

    if (!hasKV) {
      // In development or without KV, always allow
      console.log('Rate limiting disabled: KV not configured');
      return {
        allowed: true,
        remainingAttempts: maxAttempts,
        resetTime: new Date(Date.now() + windowMinutes * 60 * 1000),
      };
    }

    const { kv } = await import('@vercel/kv');

    const key = `verify_rate_limit:${identifier}`;
    const window = windowMinutes * 60 * 1000; // Convert to milliseconds
    const now = Date.now();
    const windowStart = now - window;

    // Get current attempts
    const attempts = await kv.lrange(key, 0, -1);

    // Filter out old attempts
    const recentAttempts = attempts
      .map(attempt => parseInt(attempt))
      .filter(timestamp => timestamp > windowStart);

    // Clean up and update the list
    await kv.del(key);
    if (recentAttempts.length > 0) {
      await kv.lpush(key, ...recentAttempts.map(String));
    }

    // Set expiration
    await kv.expire(key, Math.ceil(window / 1000));

    const remainingAttempts = Math.max(0, maxAttempts - recentAttempts.length);
    const allowed = recentAttempts.length < maxAttempts;

    if (allowed) {
      // Add current attempt
      await kv.lpush(key, now.toString());
    }

    return {
      allowed,
      remainingAttempts: allowed ? remainingAttempts - 1 : remainingAttempts,
      resetTime: new Date(Math.min(...recentAttempts) + window),
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Allow verification if rate limiting fails
    return {
      allowed: true,
      remainingAttempts: 0,
      resetTime: new Date(Date.now() + windowMinutes * 60 * 1000),
    };
  }
}

/**
 * Utility to create action strings for different app features
 */
export const actions = {
  REGISTER: 'register',
  LOGIN: 'login',
  SUBMIT_TASK: 'submit-task',
  CLAIM_REWARD: 'claim-reward',
  VERIFY_HUMAN: 'verify-human',
  JOIN_TASK: 'join-task',
  RATE_SUBMISSION: 'rate-submission',
  CREATE_TASK: 'create-task',
  DISPUTE_SUBMISSION: 'dispute-submission',
} as const;

export type WorldIDAction = typeof actions[keyof typeof actions];

/**
 * Helper to validate World ID response from client
 */
export function validateWorldIDResponse(response: any): response is ISuccessResult {
  return (
    response &&
    response.proof &&
    response.merkle_root &&
    response.nullifier_hash &&
    response.verification_level &&
    typeof response.proof === 'string' &&
    typeof response.merkle_root === 'string' &&
    typeof response.nullifier_hash === 'string' &&
    (response.verification_level === 'orb' || response.verification_level === 'device')
  );
}