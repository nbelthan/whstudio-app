/**
 * Payment utilities for MiniKit integration and blockchain transactions
 * Handles payment processing, validation, and transaction management
 */

import { queries } from './db/client';

// Environment variables validation
const PAYMENT_WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET;

if (!PAYMENT_WEBHOOK_SECRET) {
  throw new Error('PAYMENT_WEBHOOK_SECRET environment variable is not set');
}

export interface PaymentRequest {
  task_id?: string;
  submission_id?: string;
  amount: number;
  currency: 'WLD' | 'ETH' | 'USDC';
  payment_type: 'task_reward' | 'escrow_deposit' | 'escrow_release' | 'refund';
  recipient_id?: string;
  recipient_address?: string;
  description?: string;
  expires_in_hours?: number;
}

export interface PaymentResponse {
  id: string;
  external_payment_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  transaction_hash?: string;
  expires_at: Date;
  created_at: Date;
}

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'expired';

export interface WebhookPayload {
  payment_id: string;
  external_payment_id: string;
  status: PaymentStatus;
  transaction_hash?: string;
  block_number?: number;
  gas_used?: string;
  gas_price?: string;
  failure_reason?: string;
  timestamp: string;
  signature: string;
}

/**
 * Create a new payment record
 */
export async function createPayment(
  payerId: string,
  paymentData: PaymentRequest
): Promise<PaymentResponse> {
  try {
    // Validate payment amount
    if (paymentData.amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    // Minimum transfer validation
    if (paymentData.amount < 0.1) {
      throw new Error('Minimum transfer amount is $0.1');
    }

    // Check daily transaction limit
    const dailyCount = await getDailyTransactionCount(payerId);
    if (dailyCount >= 300) {
      throw new Error('Daily transaction limit (300) exceeded');
    }

    // Generate unique external payment ID
    const externalPaymentId = generateExternalPaymentId();

    // Calculate expiration time
    const hoursToExpire = paymentData.expires_in_hours || 24;
    const expiresAt = new Date(Date.now() + hoursToExpire * 60 * 60 * 1000);

    // Create payment record
    const newPayment = {
      task_id: paymentData.task_id || null,
      submission_id: paymentData.submission_id || null,
      payer_id: payerId,
      recipient_id: paymentData.recipient_id || null,
      amount: paymentData.amount,
      currency: paymentData.currency,
      payment_type: paymentData.payment_type,
      blockchain_network: 'world-chain',
      external_payment_id: externalPaymentId,
      expires_at: expiresAt
    };

    const createdPayments = await queries.payments.create(newPayment);
    const payment = createdPayments[0];

    return {
      id: payment.id,
      external_payment_id: externalPaymentId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      transaction_hash: payment.transaction_hash,
      expires_at: payment.expires_at,
      created_at: payment.created_at
    };
  } catch (error) {
    console.error('Payment creation error:', error);
    throw new Error(`Failed to create payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update payment status after webhook
 */
export async function updatePaymentStatus(
  paymentId: string,
  status: PaymentStatus,
  transactionHash?: string,
  failureReason?: string
): Promise<boolean> {
  try {
    const updatedPayments = await queries.payments.updateStatus(
      paymentId,
      status,
      transactionHash
    );

    if (updatedPayments.length === 0) {
      throw new Error('Payment not found');
    }

    const payment = updatedPayments[0];

    // If payment is completed, mark associated submission as paid
    if (status === 'completed' && payment.submission_id) {
      await queries.submissions.markPaid(payment.submission_id);
    }

    return true;
  } catch (error) {
    console.error('Payment status update error:', error);
    return false;
  }
}

/**
 * Validate payment for task reward
 */
export async function validateTaskRewardPayment(
  taskId: string,
  submissionId: string,
  payerId: string,
  amount: number
): Promise<{ valid: boolean; error?: string; recipientId?: string }> {
  try {
    // Verify task exists and payer is the creator
    const tasks = await queries.tasks.findById(taskId);
    if (tasks.length === 0) {
      return { valid: false, error: 'Task not found' };
    }

    const task = tasks[0];
    if (task.creator_id !== payerId) {
      return { valid: false, error: 'Only task creator can initiate reward payments' };
    }

    // Verify submission exists and is approved
    const submissions = await queries.submissions.findById(submissionId);
    if (submissions.length === 0) {
      return { valid: false, error: 'Submission not found' };
    }

    const submission = submissions[0];
    if (submission.status !== 'approved') {
      return { valid: false, error: 'Can only pay for approved submissions' };
    }

    // Verify amount matches task reward
    if (Math.abs(amount - task.reward_amount) > 0.001) {
      return { valid: false, error: 'Payment amount does not match task reward' };
    }

    // Check if payment already exists for this submission
    const { db } = await import('./db/client');
    const existingPaymentQuery = `
      SELECT id FROM payments
      WHERE submission_id = $1 AND status IN ('completed', 'processing', 'pending')
    `;
    const existingPayments = await db(existingPaymentQuery, [submissionId]);

    if (existingPayments.length > 0) {
      return { valid: false, error: 'Payment already exists for this submission' };
    }

    return {
      valid: true,
      recipientId: submission.user_id
    };
  } catch (error) {
    console.error('Task reward validation error:', error);
    return { valid: false, error: 'Validation failed' };
  }
}

/**
 * Get payment history for a user
 */
export async function getUserPaymentHistory(
  userId: string,
  filters: {
    type?: 'sent' | 'received' | 'all';
    status?: PaymentStatus;
    payment_type?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{
  payments: any[];
  total: number;
  pagination: {
    limit: number;
    offset: number;
    has_more: boolean;
  };
}> {
  try {
    const {
      type = 'all',
      status,
      payment_type,
      limit = 50,
      offset = 0
    } = filters;

    const { db } = await import('./db/client');

    // Build query conditions
    let whereConditions = [];
    let queryParams = [userId];
    let paramIndex = 2;

    // Base condition - user is either payer or recipient
    if (type === 'sent') {
      whereConditions.push(`p.payer_id = $1`);
    } else if (type === 'received') {
      whereConditions.push(`p.recipient_id = $1`);
    } else {
      whereConditions.push(`(p.payer_id = $1 OR p.recipient_id = $1)`);
    }

    // Add filters
    if (status) {
      whereConditions.push(`p.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (payment_type) {
      whereConditions.push(`p.payment_type = $${paramIndex}`);
      queryParams.push(payment_type);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get payments
    const paymentsQuery = `
      SELECT
        p.*,
        t.title as task_title,
        payer.username as payer_username,
        recipient.username as recipient_username
      FROM payments p
      LEFT JOIN tasks t ON p.task_id = t.id
      LEFT JOIN users payer ON p.payer_id = payer.id
      LEFT JOIN users recipient ON p.recipient_id = recipient.id
      WHERE ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const payments = await db(paymentsQuery, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM payments p
      WHERE ${whereClause}
    `;
    const countParams = queryParams.slice(0, -2); // Remove limit and offset
    const countResult = await db(countQuery, countParams);
    const total = parseInt(countResult[0]?.total || '0');

    // Format payments
    const formattedPayments = payments.map((payment: any) => ({
      id: payment.id,
      task_id: payment.task_id,
      task_title: payment.task_title,
      submission_id: payment.submission_id,
      amount: payment.amount,
      currency: payment.currency,
      payment_type: payment.payment_type,
      status: payment.status,
      transaction_hash: payment.transaction_hash,
      blockchain_network: payment.blockchain_network,
      external_payment_id: payment.external_payment_id,
      failure_reason: payment.failure_reason,
      processed_at: payment.processed_at,
      expires_at: payment.expires_at,
      created_at: payment.created_at,
      payer_username: payment.payer_username,
      recipient_username: payment.recipient_username,
      is_payer: payment.payer_id === userId,
      is_recipient: payment.recipient_id === userId
    }));

    return {
      payments: formattedPayments,
      total,
      pagination: {
        limit,
        offset,
        has_more: offset + formattedPayments.length < total
      }
    };
  } catch (error) {
    console.error('Payment history error:', error);
    throw new Error('Failed to fetch payment history');
  }
}

/**
 * Get daily transaction count for rate limiting
 */
export async function getDailyTransactionCount(userId: string): Promise<number> {
  try {
    const { db } = await import('./db/client');
    const query = `
      SELECT COUNT(*) as daily_count
      FROM payments
      WHERE payer_id = $1
      AND created_at >= CURRENT_DATE
      AND status IN ('pending', 'processing', 'completed')
    `;

    const result = await db(query, [userId]);
    return parseInt(result[0]?.daily_count || '0');
  } catch (error) {
    console.error('Daily transaction count error:', error);
    return 0;
  }
}

/**
 * Generate unique external payment ID
 */
export function generateExternalPaymentId(): string {
  const timestamp = Date.now();
  const randomHex = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  return `wh_${timestamp}_${randomHex}`;
}

/**
 * Validate webhook signature
 */
export function validateWebhookSignature(
  payload: string,
  signature: string
): boolean {
  try {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', PAYMENT_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Webhook signature validation error:', error);
    return false;
  }
}

/**
 * Process webhook payload
 */
export async function processWebhook(payload: WebhookPayload): Promise<boolean> {
  try {
    // Validate payload
    if (!payload.payment_id || !payload.external_payment_id || !payload.status) {
      throw new Error('Invalid webhook payload');
    }

    // Update payment status
    const success = await updatePaymentStatus(
      payload.payment_id,
      payload.status,
      payload.transaction_hash,
      payload.failure_reason
    );

    if (!success) {
      throw new Error('Failed to update payment status');
    }

    // Log webhook processing
    console.log(`Webhook processed for payment ${payload.payment_id}: ${payload.status}`);

    return true;
  } catch (error) {
    console.error('Webhook processing error:', error);
    return false;
  }
}

/**
 * Calculate platform fees
 */
export function calculateFees(amount: number, currency: 'WLD' | 'ETH' | 'USDC') {
  // Platform fee: 2.5% for task rewards, 1% for other transactions
  const platformFeeRate = 0.025;
  const platformFee = Math.round(amount * platformFeeRate * 100) / 100;

  // Estimated gas fees (varies by network congestion)
  const gasFeeEstimate = currency === 'ETH' ? 0.001 : 0.0001;

  const netAmount = amount - platformFee - gasFeeEstimate;

  return {
    gross_amount: amount,
    platform_fee: platformFee,
    gas_fee_estimate: gasFeeEstimate,
    net_amount: Math.max(0, netAmount)
  };
}

/**
 * Check payment eligibility
 */
export async function checkPaymentEligibility(
  userId: string,
  amount: number
): Promise<{ eligible: boolean; reason?: string }> {
  try {
    // Check user verification status
    const { db } = await import('./db/client');
    const userQuery = `
      SELECT verification_level, is_active, total_earned
      FROM users
      WHERE id = $1
    `;
    const users = await db(userQuery, [userId]);

    if (users.length === 0) {
      return { eligible: false, reason: 'User not found' };
    }

    const user = users[0];
    if (!user.is_active) {
      return { eligible: false, reason: 'User account is inactive' };
    }

    // Check daily limits
    const dailyCount = await getDailyTransactionCount(userId);
    if (dailyCount >= 300) {
      return { eligible: false, reason: 'Daily transaction limit exceeded' };
    }

    // Check amount limits
    if (amount > 1000) {
      return { eligible: false, reason: 'Amount exceeds single transaction limit ($1000)' };
    }

    return { eligible: true };
  } catch (error) {
    console.error('Payment eligibility check error:', error);
    return { eligible: false, reason: 'Eligibility check failed' };
  }
}

/**
 * Get payment statistics for admin dashboard
 */
export async function getPaymentStats(filters: {
  date_from?: string;
  date_to?: string;
  payment_type?: string;
} = {}) {
  try {
    const { db } = await import('./db/client');

    let whereConditions = ['1=1'];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (filters.date_from) {
      whereConditions.push(`created_at >= $${paramIndex}`);
      queryParams.push(filters.date_from);
      paramIndex++;
    }

    if (filters.date_to) {
      whereConditions.push(`created_at <= $${paramIndex}`);
      queryParams.push(filters.date_to);
      paramIndex++;
    }

    if (filters.payment_type) {
      whereConditions.push(`payment_type = $${paramIndex}`);
      queryParams.push(filters.payment_type);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const query = `
      SELECT
        COUNT(*) as total_transactions,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_volume,
        SUM(CASE WHEN status = 'completed' THEN platform_fee ELSE 0 END) as total_fees,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_transactions,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transactions,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_transactions,
        AVG(CASE WHEN status = 'completed' THEN amount END) as average_transaction_amount
      FROM payments
      WHERE ${whereClause}
    `;

    const result = await db(query, queryParams);
    return result[0];
  } catch (error) {
    console.error('Payment stats error:', error);
    throw new Error('Failed to fetch payment statistics');
  }
}