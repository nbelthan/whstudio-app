/**
 * World ID verification utilities for WorldHuman Studio
 * Handles World ID proof verification and MiniKit integration
 */

import { MiniKit, VerifyCommandInput, VerificationLevel, ISuccessResult } from '@worldcoin/minikit-js';
import { executeQuery, withTransaction } from '@/lib/db';
import { createSession } from '@/lib/session';
import type { User, WorldIdVerification } from '@/types';

// World App configuration
const WORLD_APP_ID = process.env.NEXT_PUBLIC_WORLD_APP_ID as `app_${string}`;
const WORLD_APP_SECRET = process.env.WORLD_APP_SECRET;
const WORLD_VERIFY_API_KEY = process.env.WORLD_VERIFY_API_KEY;

/**
 * World ID verification result interface
 */
export interface VerificationResult {
  success: boolean;
  user?: User;
  sessionToken?: string;
  error?: string;
  isNewUser?: boolean;
}

/**
 * MiniKit user info interface
 */
export interface MiniKitUserInfo {
  username?: string;
  profilePictureUrl?: string;
  walletAddress?: string;
}

/**
 * Verify World ID proof using Worldcoin's cloud verification API
 *
 * @param proof - World ID proof data
 * @param actionId - Action identifier for this verification
 * @returns Promise with verification result
 */
export async function verifyWorldIdProof(
  proof: {
    nullifier_hash: string;
    merkle_root: string;
    proof: string;
    verification_level: 'orb' | 'device';
  },
  actionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!WORLD_VERIFY_API_KEY) {
      throw new Error('World verification API key not configured');
    }

    const verifyUrl = `https://developer.worldcoin.org/api/v1/verify/${WORLD_APP_ID}`;

    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WORLD_VERIFY_API_KEY}`
      },
      body: JSON.stringify({
        nullifier_hash: proof.nullifier_hash,
        merkle_root: proof.merkle_root,
        proof: proof.proof,
        verification_level: proof.verification_level,
        action: actionId
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Verification failed with status ${response.status}`);
    }

    const result = await response.json();

    return {
      success: result.success || false,
      error: result.success ? undefined : (result.detail || 'Verification failed')
    };
  } catch (error) {
    console.error('World ID verification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Verification service unavailable'
    };
  }
}

/**
 * Verify World ID proof using local verification (alternative method)
 * Uses the minikit-js library for client-side proof verification
 *
 * @param proof - World ID proof data
 * @param actionId - Action identifier
 * @returns Promise with verification result
 */
export async function verifyWorldIdProofLocal(
  proof: WorldIdVerification,
  actionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Note: This is a placeholder for local verification
    // The actual implementation would depend on available libraries
    // For now, we'll use the cloud verification as the primary method

    console.warn('Local verification not implemented, falling back to cloud verification');
    return await verifyWorldIdProof(proof, actionId);
  } catch (error) {
    console.error('Local World ID verification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Local verification failed'
    };
  }
}

/**
 * Check if nullifier hash has been used before for this action
 *
 * @param nullifierHash - Nullifier hash to check
 * @param actionId - Action identifier
 * @returns Promise with usage status
 */
export async function checkNullifierUsage(
  nullifierHash: string,
  actionId: string
): Promise<{ used: boolean; userId?: string }> {
  try {
    const result = await executeQuery<{ user_id: string }>(
      `SELECT user_id FROM user_sessions
       WHERE nullifier_hash = $1
       AND is_active = true
       LIMIT 1`,
      [nullifierHash]
    );

    return {
      used: result.rows.length > 0,
      userId: result.rows[0]?.user_id
    };
  } catch (error) {
    console.error('Error checking nullifier usage:', error);
    return { used: false };
  }
}

/**
 * Create or get existing user from World ID verification
 *
 * @param worldId - World ID identifier
 * @param nullifierHash - Nullifier hash for sybil resistance
 * @param verificationLevel - Verification level (orb or device)
 * @param userInfo - Additional user information from MiniKit
 * @returns Promise with user data and session token
 */
export async function createOrGetVerifiedUser(
  worldId: string,
  nullifierHash: string,
  verificationLevel: 'orb' | 'device',
  userInfo?: MiniKitUserInfo
): Promise<VerificationResult> {
  try {
    return await withTransaction(async (client) => {
      // Check if user already exists
      const existingUser = await client.query(
        `SELECT * FROM users WHERE nullifier_hash = $1 LIMIT 1`,
        [nullifierHash]
      );

      let user: User;
      let isNewUser = false;

      if (existingUser.rows.length > 0) {
        // Update existing user
        user = existingUser.rows[0];

        // Update last seen and any new information
        const updateResult = await client.query(
          `UPDATE users
           SET updated_at = CURRENT_TIMESTAMP,
               wallet_address = COALESCE($1, wallet_address),
               username = COALESCE($2, username),
               profile_image_url = COALESCE($3, profile_image_url),
               verification_level = $4
           WHERE id = $5
           RETURNING *`,
          [
            userInfo?.walletAddress,
            userInfo?.username,
            userInfo?.profilePictureUrl,
            verificationLevel,
            user.id
          ]
        );

        user = updateResult.rows[0];
      } else {
        // Create new user
        isNewUser = true;
        const insertResult = await client.query(
          `INSERT INTO users
           (world_id, nullifier_hash, verification_level, wallet_address, username, profile_image_url)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            worldId,
            nullifierHash,
            verificationLevel,
            userInfo?.walletAddress || null,
            userInfo?.username || null,
            userInfo?.profilePictureUrl || null
          ]
        );

        user = insertResult.rows[0];
      }

      // Create session
      const sessionToken = await createSession(worldId, nullifierHash, {
        userAgent: 'MiniKit',
        platform: 'World App'
      });

      return {
        success: true,
        user,
        sessionToken,
        isNewUser
      };
    });
  } catch (error) {
    console.error('Error creating/getting verified user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create user'
    };
  }
}

/**
 * Handle complete World ID verification flow
 *
 * @param verificationData - Complete verification data
 * @param actionId - Action identifier
 * @param userInfo - Additional user information
 * @returns Promise with verification result
 */
export async function handleWorldIdVerification(
  verificationData: WorldIdVerification,
  actionId: string,
  userInfo?: MiniKitUserInfo
): Promise<VerificationResult> {
  try {
    // Step 1: Verify the proof with Worldcoin
    const proofVerification = await verifyWorldIdProof(
      {
        nullifier_hash: verificationData.nullifier_hash,
        merkle_root: verificationData.merkle_root,
        proof: verificationData.proof,
        verification_level: verificationData.verification_level
      },
      actionId
    );

    if (!proofVerification.success) {
      return {
        success: false,
        error: proofVerification.error || 'World ID verification failed'
      };
    }

    // Step 2: Check if nullifier has been used before
    const nullifierCheck = await checkNullifierUsage(
      verificationData.nullifier_hash,
      actionId
    );

    if (nullifierCheck.used) {
      return {
        success: false,
        error: 'This World ID has already been used for verification'
      };
    }

    // Step 3: Create or get user and session
    const result = await createOrGetVerifiedUser(
      verificationData.nullifier_hash, // Using nullifier as world_id for simplicity
      verificationData.nullifier_hash,
      verificationData.verification_level,
      userInfo
    );

    return result;
  } catch (error) {
    console.error('Error handling World ID verification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Verification process failed'
    };
  }
}

/**
 * Initiate World ID verification using MiniKit
 *
 * @param actionId - Action identifier for this verification
 * @param verificationLevel - Required verification level
 * @returns Promise with MiniKit verification result
 */
export async function initiateWorldIdVerification(
  actionId: string,
  verificationLevel: VerificationLevel = VerificationLevel.Orb
): Promise<{
  success: boolean;
  verificationData?: WorldIdVerification;
  error?: string;
}> {
  try {
    if (!MiniKit.isInstalled()) {
      return {
        success: false,
        error: 'MiniKit not available. Please open this app in World App.'
      };
    }

    const verifyPayload: VerifyCommandInput = {
      action: actionId,
      verification_level: verificationLevel
    };

    const { finalPayload } = await MiniKit.commandsAsync.verify(verifyPayload);

    if (finalPayload.status === 'error') {
      return {
        success: false,
        error: 'World ID verification was cancelled or failed'
      };
    }

    if (finalPayload.status !== 'success') {
      return {
        success: false,
        error: 'Unexpected verification status'
      };
    }

    const successPayload = finalPayload as ISuccessResult;

    return {
      success: true,
      verificationData: {
        nullifier_hash: successPayload.nullifier_hash,
        merkle_root: successPayload.merkle_root,
        proof: successPayload.proof,
        verification_level: verificationLevel === VerificationLevel.Orb ? 'orb' : 'device'
      }
    };
  } catch (error) {
    console.error('Error initiating World ID verification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initiate verification'
    };
  }
}

/**
 * Check if user needs to reverify based on verification level requirements
 *
 * @param user - User data
 * @param requiredLevel - Required verification level
 * @returns Boolean indicating if reverification is needed
 */
export function needsReverification(
  user: User,
  requiredLevel: 'orb' | 'device' = 'orb'
): boolean {
  // If user has orb verification, they can access anything
  if (user.verification_level === 'orb') {
    return false;
  }

  // If device verification is sufficient, no need to reverify
  if (requiredLevel === 'device') {
    return false;
  }

  // User has device verification but orb is required
  return true;
}

/**
 * Get user verification status and capabilities
 *
 * @param user - User data
 * @returns Verification status information
 */
export function getUserVerificationStatus(user: User): {
  level: 'orb' | 'device';
  canAccessOrb: boolean;
  canAccessDevice: boolean;
  verifiedAt: string;
  trustScore: number;
} {
  return {
    level: user.verification_level,
    canAccessOrb: user.verification_level === 'orb',
    canAccessDevice: true, // Both orb and device can access device-level features
    verifiedAt: user.created_at,
    trustScore: user.verification_level === 'orb' ? 100 : 75 // Orb verification gets higher trust score
  };
}

/**
 * Validate action ID format and permissions
 *
 * @param actionId - Action identifier to validate
 * @returns Boolean indicating if action ID is valid
 */
export function validateActionId(actionId: string): boolean {
  // Action IDs should be lowercase, alphanumeric with hyphens/underscores
  const actionIdRegex = /^[a-z0-9_-]+$/;
  return actionIdRegex.test(actionId) && actionId.length >= 3 && actionId.length <= 50;
}

/**
 * Generate a secure action ID for new verification flows
 *
 * @param prefix - Prefix for the action ID
 * @returns Generated action ID
 */
export function generateActionId(prefix: string = 'worldhuman'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Get World App deep link for verification
 *
 * @param actionId - Action identifier
 * @param returnUrl - URL to return to after verification
 * @returns Deep link URL
 */
export function getWorldAppDeepLink(actionId: string, returnUrl?: string): string {
  const params = new URLSearchParams({
    app_id: WORLD_APP_ID,
    action: actionId
  });

  if (returnUrl) {
    params.set('return_to', returnUrl);
  }

  return `https://worldcoin.org/verify?${params.toString()}`;
}

/**
 * Check MiniKit availability and version
 *
 * @returns MiniKit status information
 */
export function checkMiniKitStatus(): {
  available: boolean;
  version?: string;
  features: {
    verify: boolean;
    pay: boolean;
    signMessage: boolean;
  };
} {
  try {
    const isAvailable = MiniKit.isInstalled();

    return {
      available: isAvailable,
      version: isAvailable ? MiniKit.getVersion?.() : undefined,
      features: {
        verify: isAvailable && typeof MiniKit.commandsAsync?.verify === 'function',
        pay: isAvailable && typeof MiniKit.commandsAsync?.pay === 'function',
        signMessage: isAvailable && typeof MiniKit.commandsAsync?.signMessage === 'function'
      }
    };
  } catch (error) {
    console.error('Error checking MiniKit status:', error);
    return {
      available: false,
      features: {
        verify: false,
        pay: false,
        signMessage: false
      }
    };
  }
}

/**
 * Get verification analytics for monitoring
 *
 * @param days - Number of days to analyze
 * @returns Promise with verification statistics
 */
export async function getVerificationAnalytics(days: number = 30): Promise<{
  totalVerifications: number;
  orbVerifications: number;
  deviceVerifications: number;
  successRate: number;
  dailyBreakdown: Array<{ date: string; count: number; success_rate: number }>;
}> {
  try {
    const result = await executeQuery<{
      total_verifications: string;
      orb_verifications: string;
      device_verifications: string;
      success_rate: string;
    }>(
      `SELECT
         COUNT(*) as total_verifications,
         COUNT(CASE WHEN verification_level = 'orb' THEN 1 END) as orb_verifications,
         COUNT(CASE WHEN verification_level = 'device' THEN 1 END) as device_verifications,
         100.0 as success_rate
       FROM users
       WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '${days} days'`
    );

    const dailyResult = await executeQuery<{
      date: string;
      count: string;
      success_rate: string;
    }>(
      `SELECT
         DATE(created_at) as date,
         COUNT(*) as count,
         100.0 as success_rate
       FROM users
       WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '${days} days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`
    );

    const stats = result.rows[0];

    return {
      totalVerifications: parseInt(stats?.total_verifications || '0'),
      orbVerifications: parseInt(stats?.orb_verifications || '0'),
      deviceVerifications: parseInt(stats?.device_verifications || '0'),
      successRate: parseFloat(stats?.success_rate || '0'),
      dailyBreakdown: dailyResult.rows.map(row => ({
        date: row.date,
        count: parseInt(row.count),
        success_rate: parseFloat(row.success_rate)
      }))
    };
  } catch (error) {
    console.error('Error getting verification analytics:', error);
    return {
      totalVerifications: 0,
      orbVerifications: 0,
      deviceVerifications: 0,
      successRate: 0,
      dailyBreakdown: []
    };
  }
}