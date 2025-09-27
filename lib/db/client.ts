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
      // Use the pool for parameterized queries
      const pool = getPool();
      const result = await pool.query(query, params);
      return result.rows as T[];
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

    // Execute each statement using the pool
    const pool = getPool();
    for (const statement of statements) {
      await pool.query(statement);
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

    findWithFilters: (filters: {
      limit?: number;
      offset?: number;
      category?: string;
      difficulty?: number;
      task_type?: string;
      search?: string;
      sort?: string;
      status?: string;
    }) => {
      const {
        limit = 50,
        offset = 0,
        category,
        difficulty,
        task_type,
        search,
        sort = 'priority',
        status = 'active'
      } = filters;

      let query = `
        SELECT t.*, tc.name as category_name, u.username as creator_username,
               COUNT(*) OVER() as total_count
        FROM tasks t
        LEFT JOIN task_categories tc ON t.category_id = tc.id
        LEFT JOIN users u ON t.creator_id = u.id
        WHERE t.status = $3
        AND (t.expires_at IS NULL OR t.expires_at > CURRENT_TIMESTAMP)
      `;

      const params: any[] = [limit, offset, status];
      let paramCount = 3;

      if (category && category !== 'all') {
        paramCount++;
        query += ` AND tc.name = $${paramCount}`;
        params.push(category);
      }

      if (difficulty) {
        paramCount++;
        query += ` AND t.difficulty_level = $${paramCount}`;
        params.push(difficulty);
      }

      if (task_type) {
        paramCount++;
        query += ` AND t.task_type = $${paramCount}`;
        params.push(task_type);
      }

      if (search) {
        paramCount++;
        query += ` AND (
          t.title ILIKE $${paramCount} OR
          t.description ILIKE $${paramCount} OR
          tc.name ILIKE $${paramCount}
        )`;
        params.push(`%${search}%`);
      }

      // Add sorting
      switch (sort) {
        case 'reward':
          query += ' ORDER BY t.reward_amount DESC, t.created_at DESC';
          break;
        case 'difficulty':
          query += ' ORDER BY t.difficulty_level ASC, t.created_at DESC';
          break;
        case 'time':
          query += ' ORDER BY t.estimated_time_minutes ASC, t.created_at DESC';
          break;
        case 'created':
          query += ' ORDER BY t.created_at DESC';
          break;
        default:
          query += ' ORDER BY t.priority DESC, t.created_at DESC';
      }

      query += ` LIMIT $1 OFFSET $2`;

      return executeQuery<any>(query, params);
    },

    getCategories: () =>
      executeQuery<any>(`
        SELECT tc.*, COUNT(t.id) as task_count
        FROM task_categories tc
        LEFT JOIN tasks t ON tc.id = t.category_id AND t.status = 'active'
        WHERE tc.is_active = true
        GROUP BY tc.id, tc.name, tc.description, tc.icon, tc.is_active, tc.created_at
        ORDER BY tc.name
      `),

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

    findByUser: (userId: string, filters: {
      status?: string;
      limit?: number;
      offset?: number;
      task_type?: string;
      date_from?: string;
      date_to?: string;
      sort?: string;
      order?: string;
    } = {}) => {
      const {
        status = 'all',
        limit = 50,
        offset = 0,
        task_type,
        date_from,
        date_to,
        sort = 'created_at',
        order = 'desc'
      } = filters;

      let query = `
        SELECT s.*,
               t.title as task_title,
               t.description as task_description,
               t.task_type,
               t.difficulty_level,
               t.reward_amount,
               t.reward_currency,
               t.creator_id as task_creator_id,
               t.expires_at as task_expires_at,
               t.status as task_status,
               tc.name as category_name,
               u_creator.username as creator_username,
               u_reviewer.username as reviewer_username,
               p.id as payment_id,
               p.amount as payment_amount,
               p.currency as payment_currency,
               p.status as payment_status,
               p.transaction_hash,
               p.processed_at as payment_processed_at,
               COUNT(*) OVER() as total_count
        FROM submissions s
        LEFT JOIN tasks t ON s.task_id = t.id
        LEFT JOIN task_categories tc ON t.category_id = tc.id
        LEFT JOIN users u_creator ON t.creator_id = u_creator.id
        LEFT JOIN users u_reviewer ON s.reviewer_id = u_reviewer.id
        LEFT JOIN payments p ON s.id = p.submission_id AND p.status = 'completed'
        WHERE s.user_id = $1
      `;

      const params: any[] = [userId];
      let paramCount = 1;

      if (status !== 'all') {
        paramCount++;
        query += ` AND s.status = $${paramCount}`;
        params.push(status);
      }

      if (task_type) {
        paramCount++;
        query += ` AND t.task_type = $${paramCount}`;
        params.push(task_type);
      }

      if (date_from) {
        paramCount++;
        query += ` AND s.created_at >= $${paramCount}`;
        params.push(date_from);
      }

      if (date_to) {
        paramCount++;
        query += ` AND s.created_at <= $${paramCount}`;
        params.push(date_to);
      }

      // Add sorting
      const sortOrder = order.toUpperCase();
      switch (sort) {
        case 'reward_amount':
          query += ` ORDER BY t.reward_amount ${sortOrder}, s.created_at DESC`;
          break;
        case 'reviewed_at':
          query += ` ORDER BY s.reviewed_at ${sortOrder} NULLS LAST, s.created_at DESC`;
          break;
        case 'quality_score':
          query += ` ORDER BY s.quality_score ${sortOrder} NULLS LAST, s.created_at DESC`;
          break;
        case 'task_title':
          query += ` ORDER BY t.title ${sortOrder}, s.created_at DESC`;
          break;
        default:
          query += ` ORDER BY s.created_at ${sortOrder}`;
      }

      query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(limit, offset);

      return executeQuery<any>(query, params);
    },

    findForReview: (filters: {
      status?: string;
      task_type?: string;
      difficulty?: number;
      reviewer_id?: string;
      date_from?: string;
      date_to?: string;
      limit?: number;
      offset?: number;
      sort?: string;
      order?: string;
    } = {}) => {
      const {
        status = 'pending',
        task_type,
        difficulty,
        reviewer_id,
        date_from,
        date_to,
        limit = 50,
        offset = 0,
        sort = 'created_at',
        order = 'asc'
      } = filters;

      let query = `
        SELECT s.*,
               t.title as task_title,
               t.description as task_description,
               t.instructions as task_instructions,
               t.task_type,
               t.difficulty_level,
               t.estimated_time_minutes,
               t.reward_amount,
               t.reward_currency,
               t.creator_id as task_creator_id,
               t.expires_at as task_expires_at,
               tc.name as category_name,
               u_submitter.username as submitter_username,
               u_submitter.reputation_score as submitter_reputation,
               u_creator.username as creator_username,
               u_reviewer.username as reviewer_username,
               COUNT(*) OVER() as total_count,
               -- Calculate review priority based on task reward and age
               CASE
                 WHEN t.reward_amount >= 5.0 AND s.created_at < NOW() - INTERVAL '24 hours' THEN 'high'
                 WHEN t.reward_amount >= 2.0 AND s.created_at < NOW() - INTERVAL '12 hours' THEN 'medium'
                 ELSE 'low'
               END as review_priority
        FROM submissions s
        LEFT JOIN tasks t ON s.task_id = t.id
        LEFT JOIN task_categories tc ON t.category_id = tc.id
        LEFT JOIN users u_submitter ON s.user_id = u_submitter.id
        LEFT JOIN users u_creator ON t.creator_id = u_creator.id
        LEFT JOIN users u_reviewer ON s.reviewer_id = u_reviewer.id
        WHERE 1=1
      `;

      const params: any[] = [];
      let paramCount = 0;

      if (status !== 'all') {
        paramCount++;
        query += ` AND s.status = $${paramCount}`;
        params.push(status);
      }

      if (task_type) {
        paramCount++;
        query += ` AND t.task_type = $${paramCount}`;
        params.push(task_type);
      }

      if (difficulty) {
        paramCount++;
        query += ` AND t.difficulty_level = $${paramCount}`;
        params.push(difficulty);
      }

      if (reviewer_id) {
        paramCount++;
        query += ` AND s.reviewer_id = $${paramCount}`;
        params.push(reviewer_id);
      }

      if (date_from) {
        paramCount++;
        query += ` AND s.created_at >= $${paramCount}`;
        params.push(date_from);
      }

      if (date_to) {
        paramCount++;
        query += ` AND s.created_at <= $${paramCount}`;
        params.push(date_to);
      }

      // Add sorting
      const sortOrder = order.toUpperCase();
      switch (sort) {
        case 'reward_amount':
          query += ` ORDER BY t.reward_amount ${sortOrder}, s.created_at ASC`;
          break;
        case 'difficulty_level':
          query += ` ORDER BY t.difficulty_level ${sortOrder}, s.created_at ASC`;
          break;
        case 'priority':
          query += ` ORDER BY
            CASE review_priority
              WHEN 'high' THEN 1
              WHEN 'medium' THEN 2
              ELSE 3
            END ${sortOrder}, s.created_at ASC`;
          break;
        default:
          query += ` ORDER BY s.created_at ${sortOrder}`;
      }

      query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(limit, offset);

      return executeQuery<any>(query, params);
    },

    findById: (submissionId: string) =>
      executeQuery<any>(`
        SELECT s.*,
               t.title as task_title,
               t.description as task_description,
               t.instructions as task_instructions,
               t.task_type,
               t.difficulty_level,
               t.estimated_time_minutes,
               t.reward_amount,
               t.reward_currency,
               t.creator_id as task_creator_id,
               t.status as task_status,
               t.expires_at as task_expires_at,
               t.created_at as task_created_at,
               tc.name as category_name,
               u_submitter.username as submitter_username,
               u_submitter.reputation_score as submitter_reputation,
               u_creator.username as creator_username,
               u_reviewer.username as reviewer_username,
               p.id as payment_id,
               p.amount as payment_amount,
               p.currency as payment_currency,
               p.status as payment_status,
               p.transaction_hash,
               p.processed_at as payment_processed_at
        FROM submissions s
        LEFT JOIN tasks t ON s.task_id = t.id
        LEFT JOIN task_categories tc ON t.category_id = tc.id
        LEFT JOIN users u_submitter ON s.user_id = u_submitter.id
        LEFT JOIN users u_creator ON t.creator_id = u_creator.id
        LEFT JOIN users u_reviewer ON s.reviewer_id = u_reviewer.id
        LEFT JOIN payments p ON s.id = p.submission_id
        WHERE s.id = $1
      `, [submissionId]),

    getStats: (userId: string, filters: {
      date_from?: string;
      date_to?: string;
    } = {}) => {
      const { date_from, date_to } = filters;

      let query = `
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN s.status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN s.status = 'approved' THEN 1 END) as approved,
          COUNT(CASE WHEN s.status = 'rejected' THEN 1 END) as rejected,
          COUNT(CASE WHEN s.status = 'under_review' THEN 1 END) as under_review,
          COALESCE(SUM(CASE WHEN s.status = 'approved' THEN t.reward_amount ELSE 0 END), 0) as total_earnings,
          COALESCE(AVG(CASE WHEN s.quality_score IS NOT NULL THEN s.quality_score END), 0) as average_quality_score,
          COALESCE(SUM(s.time_spent_minutes), 0) as total_time_spent
        FROM submissions s
        LEFT JOIN tasks t ON s.task_id = t.id
        WHERE s.user_id = $1
      `;

      const params: any[] = [userId];
      let paramCount = 1;

      if (date_from) {
        paramCount++;
        query += ` AND s.created_at >= $${paramCount}`;
        params.push(date_from);
      }

      if (date_to) {
        paramCount++;
        query += ` AND s.created_at <= $${paramCount}`;
        params.push(date_to);
      }

      return executeQuery<any>(query, params);
    },

    getEarnings: (userId: string) =>
      executeQuery<any>(`
        SELECT
          COALESCE(SUM(CASE WHEN s.status = 'approved' AND s.is_paid = true THEN t.reward_amount ELSE 0 END), 0) as total_earned,
          COALESCE(SUM(CASE WHEN s.status = 'approved' AND s.is_paid = false THEN t.reward_amount ELSE 0 END), 0) as pending_earnings,
          COALESCE(SUM(CASE WHEN s.status = 'approved' AND s.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN t.reward_amount ELSE 0 END), 0) as this_month,
          COALESCE(SUM(CASE WHEN s.status = 'approved' AND s.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
                            AND s.created_at < DATE_TRUNC('month', CURRENT_DATE) THEN t.reward_amount ELSE 0 END), 0) as last_month
        FROM submissions s
        LEFT JOIN tasks t ON s.task_id = t.id
        WHERE s.user_id = $1
      `, [userId]),

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

    updateStatus: (submissionId: string, status: string, reviewNotes?: string, reviewerId?: string, qualityScore?: number) =>
      executeQuery<any>(`
        UPDATE submissions
        SET status = $2,
            review_notes = COALESCE($3, review_notes),
            reviewer_id = COALESCE($4, reviewer_id),
            quality_score = COALESCE($5, quality_score),
            reviewed_at = CASE WHEN $2 != 'pending' THEN CURRENT_TIMESTAMP ELSE reviewed_at END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [submissionId, status, reviewNotes, reviewerId, qualityScore]),

    batchUpdateStatus: (submissionIds: string[], status: string, reviewNotes?: string, reviewerId?: string) =>
      executeQuery<any>(`
        UPDATE submissions
        SET status = $2,
            review_notes = COALESCE($3, review_notes),
            reviewer_id = COALESCE($4, reviewer_id),
            reviewed_at = CASE WHEN $2 != 'pending' THEN CURRENT_TIMESTAMP ELSE reviewed_at END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY($1::uuid[])
        RETURNING *
      `, [submissionIds, status, reviewNotes, reviewerId]),

    markPaid: (submissionId: string) =>
      executeQuery<any>(`
        UPDATE submissions
        SET is_paid = true,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [submissionId])
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

// Graceful shutdown handling (only in Node.js environment, not edge runtime)
if (typeof process !== 'undefined' && process.on && typeof process.on === 'function') {
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}