/**
 * Session management using Vercel KV for serverless environments
 * Handles user authentication, session tokens, and sybil resistance with nullifier hashes
 */

// import { kv } from '@vercel/kv'; // Optional - only use if KV is configured
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { queries } from '../db/client';

// Environment variables validation
const JWT_SECRET = process.env.JWT_SECRET;
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

// Convert JWT secret to Uint8Array for jose
const secret = new TextEncoder().encode(JWT_SECRET);

export interface SessionData {
  userId: string;
  worldId: string;
  nullifierHash: string;
  verificationLevel: 'orb' | 'device';
  walletAddress?: string;
  username?: string;
  createdAt: number;
  expiresAt: number;
}

export interface User {
  id: string;
  world_id: string;
  nullifier_hash: string;
  verification_level: 'orb' | 'device';
  wallet_address?: string;
  username?: string;
  profile_image_url?: string;
  bio?: string;
  reputation_score: number;
  total_earned: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Generate a secure session token using JWT
 */
async function generateSessionToken(sessionData: SessionData): Promise<string> {
  return await new SignJWT(sessionData)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(sessionData.expiresAt / 1000))
    .sign(secret);
}

/**
 * Verify and decode a session token
 */
async function verifySessionToken(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as SessionData;
  } catch (error) {
    console.error('Session token verification failed:', error);
    return null;
  }
}

/**
 * Create a new user session
 */
export async function createSession(userData: {
  userId: string;
  worldId: string;
  nullifierHash: string;
  verificationLevel: 'orb' | 'device';
  walletAddress?: string;
  username?: string;
}): Promise<string> {
  const now = Date.now();
  const expiresAt = now + SESSION_DURATION;

  const sessionData: SessionData = {
    ...userData,
    createdAt: now,
    expiresAt
  };

  // Generate session token
  const sessionToken = await generateSessionToken(sessionData);

  try {
    // Check if KV is configured
    const hasKV = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

    if (hasKV) {
      // Store session in Vercel KV with expiration
      const { kv } = await import('@vercel/kv');
      const kvKey = `session:${sessionToken}`;
      const expiresAtSeconds = Math.floor(expiresAt / 1000);

      await kv.setex(kvKey, expiresAtSeconds, JSON.stringify(sessionData));

      // Store nullifier mapping to prevent multiple sessions per nullifier
      const nullifierKey = `nullifier:${userData.nullifierHash}`;
      await kv.setex(nullifierKey, expiresAtSeconds, sessionToken);

      // Store user session mapping
      const userSessionKey = `user_session:${userData.userId}`;
      await kv.setex(userSessionKey, expiresAtSeconds, sessionToken);
    }

    // Set HTTP-only cookie (works without KV)
    const cookieStore = await cookies();
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION / 1000,
      path: '/'
    });

    return sessionToken;
  } catch (error) {
    console.error('Failed to create session:', error);
    // In development without KV, still return the token
    if (process.env.NODE_ENV === 'development') {
      return sessionToken;
    }
    throw new Error('Session creation failed');
  }
}

/**
 * Get current session from request cookies
 */
export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (!sessionToken) {
      return null;
    }

    // Verify token first
    const tokenData = await verifySessionToken(sessionToken);
    if (!tokenData) {
      await deleteSession();
      return null;
    }

    // Check if session has expired
    if (Date.now() > tokenData.expiresAt) {
      await deleteSession();
      return null;
    }

    // Check KV if available for additional validation
    const hasKV = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
    if (hasKV) {
      try {
        const { kv } = await import('@vercel/kv');
        const kvKey = `session:${sessionToken}`;
        const sessionDataStr = await kv.get<string>(kvKey);

        if (sessionDataStr) {
          const sessionData = JSON.parse(sessionDataStr) as SessionData;
          // Update last accessed time
          await kv.setex(kvKey, Math.floor(sessionData.expiresAt / 1000), JSON.stringify({
            ...sessionData,
            lastAccessedAt: Date.now()
          }));
          return sessionData;
        }
      } catch (kvError) {
        console.log('KV validation skipped:', kvError);
      }
    }

    // Return token data if KV is not available or validation passes
    return tokenData;
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
}

/**
 * Get current user with full details
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) {
    return null;
  }

  try {
    const users = await queries.users.findByNullifier(session.nullifierHash);
    return users.length > 0 ? users[0] as User : null;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

/**
 * Delete current session (logout)
 */
export async function deleteSession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (sessionToken) {
      // Clean up KV if available
      const hasKV = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
      if (hasKV) {
        try {
          const { kv } = await import('@vercel/kv');
          const kvKey = `session:${sessionToken}`;
          const sessionDataStr = await kv.get<string>(kvKey);

          if (sessionDataStr) {
            const sessionData = JSON.parse(sessionDataStr) as SessionData;

            // Delete all related keys
            await Promise.all([
              kv.del(kvKey),
              kv.del(`nullifier:${sessionData.nullifierHash}`),
              kv.del(`user_session:${sessionData.userId}`)
            ]);
          }
        } catch (kvError) {
          console.log('KV cleanup skipped:', kvError);
        }
      }
    }

    // Clear cookie (works without KV)
    cookieStore.delete('session');
  } catch (error) {
    console.error('Failed to delete session:', error);
  }
}

/**
 * Refresh session expiration
 */
export async function refreshSession(): Promise<boolean> {
  const session = await getSession();
  if (!session) {
    return false;
  }

  try {
    const newExpiresAt = Date.now() + SESSION_DURATION;
    const updatedSession: SessionData = {
      ...session,
      expiresAt: newExpiresAt
    };

    // Generate new token
    const newToken = await generateSessionToken(updatedSession);

    // Store in KV if available
    const hasKV = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
    if (hasKV) {
      try {
        const { kv } = await import('@vercel/kv');
        const kvKey = `session:${newToken}`;
        const expiresAtSeconds = Math.floor(newExpiresAt / 1000);

        // Store updated session
        await kv.setex(kvKey, expiresAtSeconds, JSON.stringify(updatedSession));

        // Update mappings
        await Promise.all([
          kv.setex(`nullifier:${session.nullifierHash}`, expiresAtSeconds, newToken),
          kv.setex(`user_session:${session.userId}`, expiresAtSeconds, newToken)
        ]);
      } catch (kvError) {
        console.log('KV refresh skipped:', kvError);
      }
    }

    // Update cookie (works without KV)
    const cookieStore = await cookies();
    cookieStore.set('session', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION / 1000,
      path: '/'
    });

    return true;
  } catch (error) {
    console.error('Failed to refresh session:', error);
    return false;
  }
}

/**
 * Check if user is authenticated and redirect if not
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/');
  }
  return user;
}

/**
 * Check if nullifier hash is already used (sybil protection)
 */
export async function isNullifierUsed(nullifierHash: string): Promise<boolean> {
  try {
    const hasKV = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
    if (hasKV) {
      const { kv } = await import('@vercel/kv');
      const nullifierKey = `nullifier:${nullifierHash}`;
      const existingSession = await kv.get(nullifierKey);
      return existingSession !== null;
    }
    // Without KV, check database
    const users = await queries.users.findByNullifier(nullifierHash);
    return users.length > 0;
  } catch (error) {
    console.error('Failed to check nullifier:', error);
    return false;
  }
}

/**
 * Revoke all sessions for a user (security action)
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  try {
    const hasKV = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
    if (!hasKV) {
      console.log('Session revocation requires KV store');
      return;
    }

    const { kv } = await import('@vercel/kv');
    // Get current user session
    const userSessionKey = `user_session:${userId}`;
    const sessionToken = await kv.get<string>(userSessionKey);

    if (sessionToken) {
      // Get session data
      const sessionKey = `session:${sessionToken}`;
      const sessionDataStr = await kv.get<string>(sessionKey);

      if (sessionDataStr) {
        const sessionData = JSON.parse(sessionDataStr) as SessionData;

        // Delete all related keys
        await Promise.all([
          kv.del(sessionKey),
          kv.del(`nullifier:${sessionData.nullifierHash}`),
          kv.del(userSessionKey)
        ]);
      }
    }
  } catch (error) {
    console.error('Failed to revoke user sessions:', error);
  }
}

/**
 * Get session statistics for admin purposes
 */
export async function getSessionStats(): Promise<{
  activeSessions: number;
  uniqueUsers: number;
}> {
  try {
    const hasKV = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
    if (!hasKV) {
      return { activeSessions: 0, uniqueUsers: 0 };
    }

    const { kv } = await import('@vercel/kv');
    // This is a simplified version - in production you might want to maintain counters
    const keys = await kv.keys('session:*');
    const activeSessions = keys.length;

    const userKeys = await kv.keys('user_session:*');
    const uniqueUsers = userKeys.length;

    return { activeSessions, uniqueUsers };
  } catch (error) {
    console.error('Failed to get session stats:', error);
    return { activeSessions: 0, uniqueUsers: 0 };
  }
}

/**
 * Middleware helper for API routes
 */
export async function withAuth<T extends Record<string, any>>(
  handler: (user: User, ...args: any[]) => Promise<Response>,
  ...args: any[]
): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return await handler(user, ...args);
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}