/**
 * Database connection and query utilities for WorldHuman Studio
 * Optimized for serverless environments with connection pooling
 */

import { sql } from '@vercel/postgres';
import { Pool } from '@neondatabase/serverless';

// Global connection pool for non-sql tagged queries
let pool: Pool | null = null;

/**
 * Get or create a connection pool for direct database access
 * Uses the non-pooling connection string for better performance
 */
export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('Database connection string not found. Please set POSTGRES_URL_NON_POOLING or DATABASE_URL environment variable.');
    }

    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
}

/**
 * Database query result interface
 */
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

/**
 * Execute a database query with automatic connection handling
 * Prefers Vercel Postgres when available, falls back to connection pool
 *
 * @param text - SQL query string
 * @param params - Query parameters
 * @returns Promise with query results
 */
export async function executeQuery<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  try {
    // Use Vercel Postgres for tagged template literals when possible
    if (process.env.POSTGRES_URL && !params) {
      const result = await sql.query(text);
      return {
        rows: result.rows as T[],
        rowCount: result.rowCount || 0
      };
    }

    // Use connection pool for parameterized queries
    const client = await getPool().connect();
    try {
      const result = await client.query(text, params);
      return {
        rows: result.rows as T[],
        rowCount: result.rowCount || 0
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database query error:', error);
    console.error('Query:', text);
    console.error('Params:', params);
    throw new Error(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Execute a query using Vercel Postgres tagged template
 * Preferred method for simple queries without dynamic parameters
 *
 * @param template - SQL template literal
 * @returns Promise with query results
 */
export async function sqlQuery<T = any>(template: TemplateStringsArray, ...values: any[]): Promise<QueryResult<T>> {
  try {
    const result = await sql(template, ...values);
    return {
      rows: result.rows as T[],
      rowCount: result.rowCount || 0
    };
  } catch (error) {
    console.error('SQL query error:', error);
    throw new Error(`SQL query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Execute multiple queries within a transaction
 * Ensures atomicity for related database operations
 *
 * @param callback - Function containing transaction logic
 * @returns Promise with transaction result
 */
export async function withTransaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction error:', error);
    throw new Error(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    client.release();
  }
}

/**
 * Get a single record by ID
 *
 * @param table - Table name
 * @param id - Record ID
 * @returns Promise with single record or null
 */
export async function findById<T>(table: string, id: string): Promise<T | null> {
  const result = await executeQuery<T>(
    `SELECT * FROM ${table} WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Get records with pagination
 *
 * @param table - Table name
 * @param options - Query options
 * @returns Promise with paginated results
 */
export async function findMany<T>(
  table: string,
  options: {
    where?: string;
    whereParams?: any[];
    orderBy?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ rows: T[]; total: number }> {
  const {
    where = '',
    whereParams = [],
    orderBy = 'created_at DESC',
    limit = 50,
    offset = 0
  } = options;

  const whereClause = where ? `WHERE ${where}` : '';
  const limitClause = limit ? `LIMIT ${limit}` : '';
  const offsetClause = offset ? `OFFSET ${offset}` : '';

  // Get total count
  const countQuery = `SELECT COUNT(*) as count FROM ${table} ${whereClause}`;
  const countResult = await executeQuery<{ count: string }>(countQuery, whereParams);
  const total = parseInt(countResult.rows[0]?.count || '0');

  // Get records
  const query = `
    SELECT * FROM ${table}
    ${whereClause}
    ORDER BY ${orderBy}
    ${limitClause}
    ${offsetClause}
  `;

  const result = await executeQuery<T>(query, whereParams);

  return {
    rows: result.rows,
    total
  };
}

/**
 * Insert a new record
 *
 * @param table - Table name
 * @param data - Record data
 * @returns Promise with inserted record
 */
export async function insertRecord<T>(
  table: string,
  data: Record<string, any>
): Promise<T> {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
  const columns = keys.join(', ');

  const query = `
    INSERT INTO ${table} (${columns})
    VALUES (${placeholders})
    RETURNING *
  `;

  const result = await executeQuery<T>(query, values);

  if (result.rows.length === 0) {
    throw new Error(`Failed to insert record into ${table}`);
  }

  return result.rows[0];
}

/**
 * Update a record by ID
 *
 * @param table - Table name
 * @param id - Record ID
 * @param data - Updated data
 * @returns Promise with updated record
 */
export async function updateRecord<T>(
  table: string,
  id: string,
  data: Record<string, any>
): Promise<T | null> {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');

  const query = `
    UPDATE ${table}
    SET ${setClause}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${keys.length + 1}
    RETURNING *
  `;

  const result = await executeQuery<T>(query, [...values, id]);
  return result.rows[0] || null;
}

/**
 * Delete a record by ID
 *
 * @param table - Table name
 * @param id - Record ID
 * @returns Promise with deletion success
 */
export async function deleteRecord(table: string, id: string): Promise<boolean> {
  const result = await executeQuery(
    `DELETE FROM ${table} WHERE id = $1`,
    [id]
  );
  return result.rowCount > 0;
}

/**
 * Check database connection health
 *
 * @returns Promise with connection status
 */
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; latency?: number }> {
  try {
    const start = Date.now();
    await executeQuery('SELECT 1 as health_check');
    const latency = Date.now() - start;

    return { healthy: true, latency };
  } catch (error) {
    console.error('Database health check failed:', error);
    return { healthy: false };
  }
}

/**
 * Run database migration
 * Helper function to execute schema changes
 *
 * @param migrationSql - Migration SQL statements
 * @returns Promise with migration result
 */
export async function runMigration(migrationSql: string): Promise<void> {
  try {
    const statements = migrationSql
      .split(';')
      .filter(stmt => stmt.trim())
      .map(stmt => stmt.trim());

    await withTransaction(async (client) => {
      for (const statement of statements) {
        if (statement) {
          await client.query(statement);
        }
      }
    });

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw new Error(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Close all database connections
 * Should be called on application shutdown
 */
export async function closeConnections(): Promise<void> {
  if (pool) {
    try {
      await pool.end();
      pool = null;
      console.log('Database connections closed');
    } catch (error) {
      console.error('Error closing database connections:', error);
    }
  }
}

// Export the connection pool and sql for advanced usage
export { pool, sql };

/**
 * Database queries organized by entity
 */
export const queries = {
  tasks: {
    async findById(id: string) {
      return executeQuery(`
        SELECT t.*, tc.name as category_name, u.username as creator_username
        FROM tasks t
        LEFT JOIN task_categories tc ON t.category_id = tc.id
        LEFT JOIN users u ON t.creator_id = u.id
        WHERE t.id = $1
      `, [id]);
    },

    async findWithFilters(filters: any = {}) {
      const {
        category,
        difficulty,
        task_type,
        status = 'active',
        limit = 20,
        offset = 0
      } = filters;

      let whereConditions = ['t.status = $1'];
      let params: any[] = [status];
      let paramIndex = 2;

      if (category) {
        whereConditions.push(`tc.name = $${paramIndex}`);
        params.push(category);
        paramIndex++;
      }

      if (difficulty) {
        whereConditions.push(`t.difficulty_level = $${paramIndex}`);
        params.push(difficulty);
        paramIndex++;
      }

      if (task_type) {
        whereConditions.push(`t.task_type = $${paramIndex}`);
        params.push(task_type);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      return executeQuery(`
        SELECT t.*, tc.name as category_name, u.username as creator_username
        FROM tasks t
        LEFT JOIN task_categories tc ON t.category_id = tc.id
        LEFT JOIN users u ON t.creator_id = u.id
        WHERE ${whereClause}
        ORDER BY t.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...params, limit, offset]);
    },

    async getCategories() {
      return executeQuery(`
        SELECT id, name, description
        FROM task_categories
        ORDER BY name
      `);
    },

    async create(taskData: any) {
      const {
        id, creator_id, category_id, title, description, instructions,
        task_type, difficulty_level, estimated_time_minutes, reward_amount,
        reward_currency, max_submissions, requires_verification,
        verification_criteria, attachment_urls, priority, expires_at
      } = taskData;

      return executeQuery(`
        INSERT INTO tasks (
          id, creator_id, category_id, title, description, instructions,
          task_type, difficulty_level, estimated_time_minutes, reward_amount,
          reward_currency, max_submissions, requires_verification,
          verification_criteria, attachment_urls, priority, expires_at, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'active'
        ) RETURNING *
      `, [
        id, creator_id, category_id, title, description, instructions,
        task_type, difficulty_level, estimated_time_minutes, reward_amount,
        reward_currency, max_submissions, requires_verification,
        verification_criteria, attachment_urls, priority, expires_at
      ]);
    },

    async update(id: string, updates: any) {
      const {
        title, description, instructions, status, priority, expires_at, max_submissions
      } = updates;

      return executeQuery(`
        UPDATE tasks
        SET
          title = COALESCE($1, title),
          description = COALESCE($2, description),
          instructions = COALESCE($3, instructions),
          status = COALESCE($4, status),
          priority = COALESCE($5, priority),
          expires_at = COALESCE($6, expires_at),
          max_submissions = COALESCE($7, max_submissions),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
        RETURNING *
      `, [title, description, instructions, status, priority, expires_at, max_submissions, id]);
    },

    async delete(id: string) {
      return executeQuery(`
        DELETE FROM tasks WHERE id = $1 RETURNING *
      `, [id]);
    }
  },

  submissions: {
    async findById(id: string) {
      return executeQuery(`
        SELECT s.*, u.username as submitter_username, t.title as task_title
        FROM submissions s
        LEFT JOIN users u ON s.user_id = u.id
        LEFT JOIN tasks t ON s.task_id = t.id
        WHERE s.id = $1
      `, [id]);
    },

    async findByTask(taskId: string) {
      return executeQuery(`
        SELECT s.*, u.username as submitter_username
        FROM submissions s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.task_id = $1
        ORDER BY s.created_at DESC
      `, [taskId]);
    },

    async findForReview(filters: any = {}) {
      const {
        status = 'pending',
        limit = 20,
        offset = 0
      } = filters;

      return executeQuery(`
        SELECT s.*, u.username as submitter_username, t.title as task_title
        FROM submissions s
        LEFT JOIN users u ON s.user_id = u.id
        LEFT JOIN tasks t ON s.task_id = t.id
        WHERE s.status = $1
        ORDER BY s.created_at ASC
        LIMIT $2 OFFSET $3
      `, [status, limit, offset]);
    },

    async create(submissionData: any) {
      const {
        task_id, user_id, submitter_nullifier, submission_data,
        attachments_urls, time_spent_minutes
      } = submissionData;

      return executeQuery(`
        INSERT INTO submissions (
          task_id, user_id, submitter_nullifier, submission_data,
          attachments_urls, time_spent_minutes, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, 'pending'
        ) RETURNING *
      `, [
        task_id, user_id, submitter_nullifier, JSON.stringify(submission_data),
        attachments_urls, time_spent_minutes
      ]);
    },

    async updateStatus(id: string, status: string, reviewData: any = {}) {
      const { quality_score, review_notes, reviewer_id } = reviewData;

      return executeQuery(`
        UPDATE submissions
        SET
          status = $1,
          quality_score = $2,
          review_notes = $3,
          reviewer_id = $4,
          reviewed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *
      `, [status, quality_score, review_notes, reviewer_id, id]);
    }
  },

  payments: {
    async create(paymentData: any) {
      const {
        id, user_id, task_id, submission_id, amount, currency,
        recipient_address, transaction_hash
      } = paymentData;

      return executeQuery(`
        INSERT INTO payments (
          id, user_id, task_id, submission_id, amount, currency,
          recipient_address, transaction_hash, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, 'pending'
        ) RETURNING *
      `, [
        id, user_id, task_id, submission_id, amount, currency,
        recipient_address, transaction_hash
      ]);
    },

    async updateStatus(id: string, status: string, data: any = {}) {
      const { transaction_hash, processed_at } = data;

      return executeQuery(`
        UPDATE payments
        SET
          status = $1,
          transaction_hash = COALESCE($2, transaction_hash),
          processed_at = COALESCE($3, processed_at),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `, [status, transaction_hash, processed_at, id]);
    }
  },

  users: {
    async findByNullifier(nullifierHash: string) {
      return executeQuery(`
        SELECT * FROM users WHERE nullifier_hash = $1
      `, [nullifierHash]);
    },

    async findByWorldId(worldId: string) {
      return executeQuery(`
        SELECT * FROM users WHERE world_id = $1
      `, [worldId]);
    },

    async create(userData: any) {
      const {
        id, world_id, nullifier_hash, username, email, reputation_score,
        verification_level, profile_image_url, total_earnings, tasks_completed
      } = userData;

      return executeQuery(`
        INSERT INTO users (
          id, world_id, nullifier_hash, username, email, reputation_score,
          verification_level, profile_image_url, total_earnings, tasks_completed, is_active
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true
        ) RETURNING *
      `, [
        id, world_id, nullifier_hash, username, email, reputation_score,
        verification_level, profile_image_url, total_earnings, tasks_completed
      ]);
    },

    async updateProfile(id: string, updates: any) {
      const { username, email, profile_image_url } = updates;

      return executeQuery(`
        UPDATE users
        SET
          username = COALESCE($1, username),
          email = COALESCE($2, email),
          profile_image_url = COALESCE($3, profile_image_url),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `, [username, email, profile_image_url, id]);
    }
  }
};