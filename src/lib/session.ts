/**
 * Session management utilities for WorldHuman Studio
 * Uses Vercel KV for fast session storage and JWT for stateless authentication
 */

import { kv } from '@vercel/kv';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { executeQuery } from '@/lib/db';
import type { User } from '@/types';

// JWT configuration
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'worldhuman-studio-secret-key-change-in-production'
);
const JWT_ALGORITHM = 'HS256';
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days in seconds

/**
 * Session data interface
 */
export interface SessionData {
  userId: string;
  worldId: string;
  nullifierHash: string;
  sessionId: string;
  createdAt: number;
  lastAccessedAt: number;
  deviceInfo?: {
    userAgent?: string;
    ipAddress?: string;
    platform?: string;
  };
}

/**
 * JWT payload interface
 */
interface JWTPayload {
  sessionId: string;
  userId: string;
  iat?: number;
  exp?: number;
}

/**
 * Create a new session for a verified user
 *
 * @param worldId - World ID identifier
 * @param nullifierHash - Nullifier hash for sybil resistance
 * @param deviceInfo - Optional device information
 * @returns Promise with JWT token
 */
export async function createSession(
  worldId: string,
  nullifierHash: string,
  deviceInfo?: SessionData['deviceInfo']
): Promise<string> {
  try {
    // Generate unique session ID
    const sessionId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const now = Date.now();

    // Create session data
    const sessionData: SessionData = {
      userId,
      worldId,
      nullifierHash,
      sessionId,
      createdAt: now,
      lastAccessedAt: now,
      deviceInfo
    };

    // Store session in Vercel KV with expiration
    const kvKey = `session:${sessionId}`;
    await kv.set(kvKey, sessionData, {
      ex: SESSION_DURATION // Auto-expire after 7 days
    });

    // Also store in database for persistence and analytics
    await executeQuery(
      `INSERT INTO user_sessions
       (id, user_id, session_token, nullifier_hash, device_info, ip_address, expires_at, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (session_token) DO UPDATE SET
         last_accessed_at = CURRENT_TIMESTAMP`,
      [
        sessionId,
        userId,
        sessionId, // session_token same as id for simplicity
        nullifierHash,
        deviceInfo ? JSON.stringify(deviceInfo) : null,
        deviceInfo?.ipAddress || null,
        new Date(now + SESSION_DURATION * 1000).toISOString(),
        true
      ]
    );

    // Create JWT token
    const token = await new SignJWT({ sessionId, userId } as JWTPayload)
      .setProtectedHeader({ alg: JWT_ALGORITHM })
      .setIssuedAt()
      .setExpirationTime(SESSION_DURATION)
      .sign(JWT_SECRET);

    return token;
  } catch (error) {
    console.error('Error creating session:', error);
    throw new Error(`Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate and get session data from JWT token
 *
 * @param token - JWT token
 * @returns Promise with session data or null if invalid
 */
export async function getSession(token: string): Promise<SessionData | null> {
  try {
    // Verify JWT token
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const { sessionId } = payload as JWTPayload;

    if (!sessionId) {
      return null;
    }

    // Get session from KV store
    const kvKey = `session:${sessionId}`;
    const sessionData = await kv.get<SessionData>(kvKey);

    if (!sessionData) {
      return null;
    }

    // Update last accessed time
    sessionData.lastAccessedAt = Date.now();
    await kv.set(kvKey, sessionData, { ex: SESSION_DURATION });

    // Update database record
    await executeQuery(
      `UPDATE user_sessions
       SET last_accessed_at = CURRENT_TIMESTAMP
       WHERE session_token = $1`,
      [sessionId]
    );

    return sessionData;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

/**
 * Get session from Next.js request
 *
 * @param request - Next.js request object
 * @returns Promise with session data or null
 */
export async function getSessionFromRequest(request: NextRequest): Promise<SessionData | null> {
  const token = request.cookies.get('session')?.value;
  if (!token) {
    return null;
  }
  return getSession(token);
}

/**
 * Get session from cookies (server components)
 *
 * @returns Promise with session data or null
 */
export async function getSessionFromCookies(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) {
    return null;
  }
  return getSession(token);
}

/**
 * Get current authenticated user from session
 *
 * @returns Promise with user data or null
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return null;
    }

    // Get user from database using nullifier hash
    const result = await executeQuery<User>(
      `SELECT * FROM users WHERE nullifier_hash = $1 AND is_active = true LIMIT 1`,
      [session.nullifierHash]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Require authentication - throws error if not authenticated
 *
 * @returns Promise with session data
 */
export async function requireAuth(): Promise<SessionData> {
  const session = await getSessionFromCookies();
  if (!session) {
    throw new Error('Authentication required');
  }
  return session;
}

/**
 * Require authentication with user data
 *
 * @returns Promise with user data
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

/**
 * Invalidate a session
 *
 * @param sessionId - Session ID to invalidate
 * @returns Promise with success status
 */
export async function invalidateSession(sessionId: string): Promise<boolean> {
  try {
    // Remove from KV store
    const kvKey = `session:${sessionId}`;
    await kv.del(kvKey);

    // Mark as inactive in database
    await executeQuery(
      `UPDATE user_sessions
       SET is_active = false
       WHERE session_token = $1`,
      [sessionId]
    );

    return true;
  } catch (error) {
    console.error('Error invalidating session:', error);
    return false;
  }
}

/**
 * Invalidate current session from cookies
 *
 * @returns Promise with success status
 */
export async function invalidateCurrentSession(): Promise<boolean> {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return true; // No session to invalidate
    }

    return await invalidateSession(session.sessionId);
  } catch (error) {
    console.error('Error invalidating current session:', error);
    return false;
  }
}

/**
 * Refresh session - extend expiration time
 *
 * @returns Promise with success status
 */
export async function refreshSession(): Promise<boolean> {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return false;
    }

    const kvKey = `session:${session.sessionId}`;

    // Update session data with new expiration
    session.lastAccessedAt = Date.now();
    await kv.set(kvKey, session, { ex: SESSION_DURATION });

    // Update database
    await executeQuery(
      `UPDATE user_sessions
       SET last_accessed_at = CURRENT_TIMESTAMP,
           expires_at = $1
       WHERE session_token = $2`,
      [
        new Date(Date.now() + SESSION_DURATION * 1000).toISOString(),
        session.sessionId
      ]
    );

    return true;
  } catch (error) {
    console.error('Error refreshing session:', error);
    return false;
  }
}

/**
 * Invalidate all sessions for a user
 *
 * @param nullifierHash - User's nullifier hash
 * @returns Promise with number of sessions invalidated
 */
export async function invalidateAllUserSessions(nullifierHash: string): Promise<number> {
  try {
    // Get all active sessions for user
    const result = await executeQuery<{ session_token: string }>(
      `SELECT session_token FROM user_sessions
       WHERE nullifier_hash = $1 AND is_active = true`,
      [nullifierHash]
    );

    let invalidatedCount = 0;

    // Invalidate each session
    for (const row of result.rows) {
      const success = await invalidateSession(row.session_token);
      if (success) {
        invalidatedCount++;
      }
    }

    return invalidatedCount;
  } catch (error) {
    console.error('Error invalidating all user sessions:', error);
    return 0;
  }
}

/**
 * Clean up expired sessions
 * Should be called periodically via cron job
 *
 * @returns Promise with number of sessions cleaned
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await executeQuery(
      `DELETE FROM user_sessions
       WHERE expires_at < CURRENT_TIMESTAMP
       OR created_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
       RETURNING session_token`
    );

    // Also try to clean from KV store (best effort)
    for (const row of result.rows) {
      try {
        await kv.del(`session:${row.session_token}`);
      } catch (error) {
        // Ignore KV cleanup errors
        console.warn('Failed to cleanup KV session:', row.session_token);
      }
    }

    console.log(`Cleaned up ${result.rowCount} expired sessions`);
    return result.rowCount;
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    return 0;
  }
}

/**
 * Set session cookie in response
 *
 * @param token - JWT token
 * @returns Cookie configuration object
 */
export function getSessionCookieConfig(token: string) {
  return {
    name: 'session',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: SESSION_DURATION,
    path: '/'
  };
}

/**
 * Clear session cookie
 *
 * @returns Cookie configuration object for clearing
 */
export function getClearSessionCookieConfig() {
  return {
    name: 'session',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 0,
    path: '/'
  };
}

/**
 * Check if session is close to expiring
 *
 * @param session - Session data
 * @param bufferMinutes - Buffer time in minutes before expiration
 * @returns Boolean indicating if session expires soon
 */
export function isSessionExpiringSoon(session: SessionData, bufferMinutes: number = 60): boolean {
  const expirationTime = session.createdAt + (SESSION_DURATION * 1000);
  const bufferTime = bufferMinutes * 60 * 1000;
  return Date.now() > (expirationTime - bufferTime);
}

/**
 * Get session statistics for monitoring
 *
 * @returns Promise with session statistics
 */
export async function getSessionStats(): Promise<{
  activeSessions: number;
  totalSessions: number;
  averageSessionDuration: number;
}> {
  try {
    const result = await executeQuery<{
      active_sessions: string;
      total_sessions: string;
      avg_duration_hours: string;
    }>(
      `SELECT
         COUNT(CASE WHEN is_active = true AND expires_at > CURRENT_TIMESTAMP THEN 1 END) as active_sessions,
         COUNT(*) as total_sessions,
         AVG(EXTRACT(EPOCH FROM (COALESCE(last_accessed_at, expires_at) - created_at)) / 3600) as avg_duration_hours
       FROM user_sessions
       WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'`
    );

    const row = result.rows[0];
    return {
      activeSessions: parseInt(row?.active_sessions || '0'),
      totalSessions: parseInt(row?.total_sessions || '0'),
      averageSessionDuration: parseFloat(row?.avg_duration_hours || '0')
    };
  } catch (error) {
    console.error('Error getting session stats:', error);
    return { activeSessions: 0, totalSessions: 0, averageSessionDuration: 0 };
  }
}

/**
 * Check if nullifier hash has been used
 *
 * @param nullifierHash - Nullifier hash to check
 * @returns Promise with boolean indicating if used
 */
export async function isNullifierUsed(nullifierHash: string): Promise<boolean> {
  try {
    const result = await executeQuery(
      `SELECT 1 FROM users WHERE nullifier_hash = $1 LIMIT 1`,
      [nullifierHash]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking nullifier:', error);
    return false;
  }
}

/**
 * Delete current session (logout)
 *
 * @returns Promise with success status
 */
export async function deleteSession(): Promise<boolean> {
  try {
    return await invalidateCurrentSession();
  } catch (error) {
    console.error('Error deleting session:', error);
    return false;
  }
}

/**
 * Higher-order function for API routes that require authentication
 *
 * @param handler - API route handler function
 * @returns Authenticated API route handler
 */
export function withAuth<T extends any[]>(
  handler: (user: User, ...args: T) => Promise<Response>
) {
  return async (...args: T): Promise<Response> => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      return handler(user, ...args);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  };
}