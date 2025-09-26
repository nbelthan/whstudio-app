/**
 * Database client configuration optimized for serverless environments
 * Uses Neon's serverless driver with connection pooling and error handling
 */

import { neon, neonConfig, Pool } from '@neondatabase/serverless';
import { sql } from '@vercel/postgres';

// Configure Neon for serverless environments
neonConfig.fetchConnectionCache = true;
neonConfig.useSecureWebSocket = true;

// Environment variables validation
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Primary database connection using Neon serverless driver
export const db = neon(process.env.DATABASE_URL);

// Connection pool for high-throughput operations (optional)
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10, // Maximum connections in pool
      idleTimeoutMillis: 30000, // 30 seconds
      connectionTimeoutMillis: 5000, // 5 seconds
    });
  }
  return pool;
}

// Vercel Postgres client (alternative/backup)
export const vercelDb = sql;

/**
 * Database connection health check
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const result = await db`SELECT 1 as health_check`;
    return result.length > 0 && result[0].health_check === 1;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

/**
 * Execute a database query with error handling and retry logic
 */
export async function executeQuery<T>(
  query: string,
  params: any[] = [],
  retries = 3
): Promise<T[]> {
  let lastError: Error;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Use template literal for Neon driver
      const result = await db(query, params);
      return result as T[];
    } catch (error) {
      lastError = error as Error;

      // Don't retry on syntax errors or constraint violations
      if (
        lastError.message.includes('syntax error') ||
        lastError.message.includes('duplicate key') ||
        lastError.message.includes('violates')
      ) {
        throw lastError;
      }

      // Exponential backoff for retries
      if (attempt < retries) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  throw new Error(`Database query failed after ${retries} attempts: ${lastError!.message}`);
}

/**
 * Transaction helper with automatic rollback on error
 */
export async function withTransaction<T>(
  callback: (db: typeof db) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create a transaction-aware db function
    const transactionDb = (query: string, params?: any[]) =>
      client.query(query, params).then(result => result.rows);

    const result = await callback(transactionDb as typeof db);

    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Database initialization - creates tables if they don't exist
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Read and execute schema file
    const fs = await import('fs/promises');
    const path = await import('path');

    const schemaPath = path.join(process.cwd(), 'lib', 'db', 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf-8');

    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    // Execute each statement
    for (const statement of statements) {
      await db(statement);
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Type-safe query builders for common operations
 */
export const queries = {
  // User queries
  users: {
    findByNullifier: (nullifierHash: string) =>
      executeQuery<any>(`
        SELECT * FROM users
        WHERE nullifier_hash = $1 AND is_active = true
      `, [nullifierHash]),

    findByWorldId: (worldId: string) =>
      executeQuery<any>(`
        SELECT * FROM users
        WHERE world_id = $1 AND is_active = true
      `, [worldId]),

    create: (userData: {
      world_id: string;
      nullifier_hash: string;
      verification_level: string;
      wallet_address?: string;
      username?: string;
    }) =>
      executeQuery<any>(`
        INSERT INTO users (world_id, nullifier_hash, verification_level, wallet_address, username)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        userData.world_id,
        userData.nullifier_hash,
        userData.verification_level,
        userData.wallet_address,
        userData.username
      ]),

    updateProfile: (userId: string, updates: Partial<any>) =>
      executeQuery<any>(`
        UPDATE users
        SET username = COALESCE($2, username),
            profile_image_url = COALESCE($3, profile_image_url),
            bio = COALESCE($4, bio),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [userId, updates.username, updates.profile_image_url, updates.bio])
  },

  // Task queries
  tasks: {
    findActive: (limit = 50, offset = 0) =>
      executeQuery<any>(`
        SELECT t.*, tc.name as category_name, u.username as creator_username
        FROM tasks t
        LEFT JOIN task_categories tc ON t.category_id = tc.id
        LEFT JOIN users u ON t.creator_id = u.id
        WHERE t.status = 'active'
        AND (t.expires_at IS NULL OR t.expires_at > CURRENT_TIMESTAMP)
        ORDER BY t.priority DESC, t.created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]),

    findById: (taskId: string) =>
      executeQuery<any>(`
        SELECT t.*, tc.name as category_name, u.username as creator_username
        FROM tasks t
        LEFT JOIN task_categories tc ON t.category_id = tc.id
        LEFT JOIN users u ON t.creator_id = u.id
        WHERE t.id = $1
      `, [taskId]),

    create: (taskData: any) =>
      executeQuery<any>(`
        INSERT INTO tasks (
          creator_id, category_id, title, description, instructions,
          task_type, difficulty_level, estimated_time_minutes, reward_amount,
          reward_currency, max_submissions, requires_verification, expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `, [
        taskData.creator_id, taskData.category_id, taskData.title,
        taskData.description, taskData.instructions, taskData.task_type,
        taskData.difficulty_level, taskData.estimated_time_minutes,
        taskData.reward_amount, taskData.reward_currency,
        taskData.max_submissions, taskData.requires_verification,
        taskData.expires_at
      ])
  },

  // Submission queries
  submissions: {
    findByTask: (taskId: string) =>
      executeQuery<any>(`
        SELECT s.*, u.username as submitter_username
        FROM submissions s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.task_id = $1
        ORDER BY s.created_at DESC
      `, [taskId]),

    create: (submissionData: any) =>
      executeQuery<any>(`
        INSERT INTO submissions (
          task_id, user_id, submitter_nullifier, submission_data,
          attachments_urls, time_spent_minutes
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        submissionData.task_id, submissionData.user_id,
        submissionData.submitter_nullifier, JSON.stringify(submissionData.submission_data),
        submissionData.attachments_urls, submissionData.time_spent_minutes
      ]),

    updateStatus: (submissionId: string, status: string, reviewNotes?: string, reviewerId?: string) =>
      executeQuery<any>(`
        UPDATE submissions
        SET status = $2,
            review_notes = COALESCE($3, review_notes),
            reviewer_id = COALESCE($4, reviewer_id),
            reviewed_at = CASE WHEN $2 != 'pending' THEN CURRENT_TIMESTAMP ELSE reviewed_at END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [submissionId, status, reviewNotes, reviewerId])
  },

  // Payment queries
  payments: {
    create: (paymentData: any) =>
      executeQuery<any>(`
        INSERT INTO payments (
          task_id, submission_id, payer_id, recipient_id, amount,
          currency, payment_type, blockchain_network, expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        paymentData.task_id, paymentData.submission_id, paymentData.payer_id,
        paymentData.recipient_id, paymentData.amount, paymentData.currency,
        paymentData.payment_type, paymentData.blockchain_network, paymentData.expires_at
      ]),

    updateStatus: (paymentId: string, status: string, transactionHash?: string) =>
      executeQuery<any>(`
        UPDATE payments
        SET status = $2,
            transaction_hash = COALESCE($3, transaction_hash),
            processed_at = CASE WHEN $2 = 'completed' THEN CURRENT_TIMESTAMP ELSE processed_at END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [paymentId, status, transactionHash])
  }
};

/**
 * Cleanup function for graceful shutdowns
 */
export async function cleanup(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// Graceful shutdown handling
if (typeof process !== 'undefined') {
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}