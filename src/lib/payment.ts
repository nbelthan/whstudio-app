/**
 * Payment processing utilities for WorldHuman Studio
 * Handles MiniKit payment flow integration and transaction management
 */

import { MiniKit, PayCommandInput, Tokens, tokenToDecimals } from '@worldcoin/minikit-js';
import { executeQuery, withTransaction } from '@/lib/db';
import { requireAuth } from '@/lib/session';
import type { Payment, PaymentStatus, PaymentType, RewardCurrency, User } from '@/types';

// Payment configuration
const PLATFORM_FEE_PERCENTAGE = 0.05; // 5% platform fee
const MIN_PAYMENT_AMOUNT = 0.01; // Minimum payment in base currency
const MAX_PAYMENT_AMOUNT = 1000; // Maximum payment in base currency
const PAYMENT_TIMEOUT_MINUTES = 15; // Payment expiration timeout

/**
 * Payment initiation result interface
 */
export interface PaymentInitiationResult {
  success: boolean;
  paymentId?: string;
  referenceId?: string;
  amount?: string;
  token?: string;
  to?: string;
  error?: string;
}

/**
 * Payment confirmation result interface
 */
export interface PaymentConfirmationResult {
  success: boolean;
  transactionHash?: string;
  status?: PaymentStatus;
  netAmount?: number;
  error?: string;
}

/**
 * MiniKit payment response interface
 */
interface MiniKitPaymentResponse {
  status: 'success' | 'error';
  transaction_id?: string;
  reference?: string;
}

/**
 * Calculate platform fee and net amount
 *
 * @param grossAmount - Gross payment amount
 * @param currency - Payment currency
 * @returns Fee calculation breakdown
 */
export function calculatePaymentFees(
  grossAmount: number,
  currency: RewardCurrency
): {
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  currency: RewardCurrency;
} {
  const platformFee = Math.max(0.001, grossAmount * PLATFORM_FEE_PERCENTAGE); // Minimum 0.001 fee
  const netAmount = Math.max(0, grossAmount - platformFee);

  return {
    grossAmount,
    platformFee,
    netAmount,
    currency
  };
}

/**
 * Convert currency amount to token decimals for blockchain transactions
 *
 * @param amount - Amount in base currency
 * @param currency - Currency type
 * @returns Amount in token decimals
 */
export function convertToTokenDecimals(amount: number, currency: RewardCurrency): string {
  try {
    // Convert currency to Tokens enum
    const token = currency as Tokens;
    return tokenToDecimals(amount, token).toString();
  } catch (error) {
    console.error('Error converting to token decimals:', error);
    // Fallback conversion based on common decimal places
    const decimals = currency === 'WLD' ? 18 : currency === 'USDC' ? 6 : 18;
    return (amount * Math.pow(10, decimals)).toString();
  }
}

/**
 * Validate payment amount and currency
 *
 * @param amount - Payment amount
 * @param currency - Payment currency
 * @returns Validation result
 */
export function validatePaymentAmount(
  amount: number,
  currency: RewardCurrency
): { valid: boolean; error?: string } {
  if (amount < MIN_PAYMENT_AMOUNT) {
    return {
      valid: false,
      error: `Minimum payment amount is ${MIN_PAYMENT_AMOUNT} ${currency}`
    };
  }

  if (amount > MAX_PAYMENT_AMOUNT) {
    return {
      valid: false,
      error: `Maximum payment amount is ${MAX_PAYMENT_AMOUNT} ${currency}`
    };
  }

  if (!['WLD', 'USDC', 'ETH'].includes(currency)) {
    return {
      valid: false,
      error: 'Unsupported currency'
    };
  }

  return { valid: true };
}

/**
 * Create a payment record in the database
 *
 * @param paymentData - Payment data
 * @returns Promise with created payment record
 */
export async function createPaymentRecord(paymentData: {
  taskId: string;
  submissionId?: string;
  payerId: string;
  recipientId: string;
  amount: number;
  currency: RewardCurrency;
  paymentType: PaymentType;
  externalPaymentId?: string;
}): Promise<Payment> {
  try {
    const feeCalculation = calculatePaymentFees(paymentData.amount, paymentData.currency);
    const referenceId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + PAYMENT_TIMEOUT_MINUTES * 60 * 1000);

    const result = await executeQuery<Payment>(
      `INSERT INTO payments
       (task_id, submission_id, payer_id, recipient_id, amount, currency, payment_type,
        platform_fee, net_amount, external_payment_id, expires_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        paymentData.taskId,
        paymentData.submissionId || null,
        paymentData.payerId,
        paymentData.recipientId,
        feeCalculation.grossAmount,
        paymentData.currency,
        paymentData.paymentType,
        feeCalculation.platformFee,
        feeCalculation.netAmount,
        paymentData.externalPaymentId || referenceId,
        expiresAt.toISOString(),
        'pending'
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create payment record');
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error creating payment record:', error);
    throw new Error(`Failed to create payment record: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Initiate payment for a task submission
 *
 * @param submissionId - Submission ID to pay for
 * @param recipientAddress - Recipient wallet address (optional, will use user's address)
 * @returns Promise with payment initiation result
 */
export async function initiateTaskPayment(
  submissionId: string,
  recipientAddress?: string
): Promise<PaymentInitiationResult> {
  try {
    // Get current user session
    const session = await requireAuth();

    // Get submission and task details
    const submissionResult = await executeQuery<{
      id: string;
      task_id: string;
      user_id: string;
      status: string;
      is_paid: boolean;
      reward_amount: number;
      reward_currency: RewardCurrency;
      creator_id: string;
      recipient_wallet: string;
    }>(
      `SELECT
         s.id, s.task_id, s.user_id, s.status, s.is_paid,
         t.reward_amount, t.reward_currency, t.creator_id,
         u.wallet_address as recipient_wallet
       FROM submissions s
       JOIN tasks t ON s.task_id = t.id
       JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [submissionId]
    );

    if (submissionResult.rows.length === 0) {
      return {
        success: false,
        error: 'Submission not found'
      };
    }

    const submission = submissionResult.rows[0];

    // Verify user can make this payment
    if (submission.creator_id !== session.userId) {
      return {
        success: false,
        error: 'You can only pay for submissions to your own tasks'
      };
    }

    // Check if already paid
    if (submission.is_paid) {
      return {
        success: false,
        error: 'Submission has already been paid'
      };
    }

    // Check if submission is approved
    if (submission.status !== 'approved') {
      return {
        success: false,
        error: 'Submission must be approved before payment'
      };
    }

    // Validate payment amount
    const validation = validatePaymentAmount(submission.reward_amount, submission.reward_currency);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    // Create payment record
    const payment = await createPaymentRecord({
      taskId: submission.task_id,
      submissionId: submission.id,
      payerId: session.userId,
      recipientId: submission.user_id,
      amount: submission.reward_amount,
      currency: submission.reward_currency,
      paymentType: 'task_reward'
    });

    // Convert amount to token decimals
    const tokenAmount = convertToTokenDecimals(submission.reward_amount, submission.reward_currency);
    const recipientWallet = recipientAddress || submission.recipient_wallet;

    if (!recipientWallet) {
      return {
        success: false,
        error: 'Recipient wallet address not found'
      };
    }

    return {
      success: true,
      paymentId: payment.id,
      referenceId: payment.external_payment_id || payment.id,
      amount: tokenAmount,
      token: submission.reward_currency,
      to: recipientWallet
    };
  } catch (error) {
    console.error('Error initiating task payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initiate payment'
    };
  }
}

/**
 * Execute payment using MiniKit
 *
 * @param paymentData - Payment data from initiation
 * @returns Promise with MiniKit payment result
 */
export async function executePaymentWithMiniKit(paymentData: {
  amount: string;
  token: string;
  to: string;
  reference: string;
  description?: string;
}): Promise<{
  success: boolean;
  transactionId?: string;
  reference?: string;
  error?: string;
}> {
  try {
    if (!MiniKit.isInstalled()) {
      return {
        success: false,
        error: 'MiniKit not available. Please open this app in World App.'
      };
    }

    const payInput: PayCommandInput = {
      reference: paymentData.reference,
      to: paymentData.to,
      tokens: [
        {
          symbol: paymentData.token as Tokens,
          token_amount: paymentData.amount
        }
      ],
      description: paymentData.description || 'WorldHuman Studio Task Payment'
    };

    const { finalPayload } = await MiniKit.commandsAsync.pay(payInput);

    if (finalPayload.status === 'error') {
      return {
        success: false,
        error: 'Payment was cancelled or failed'
      };
    }

    if (finalPayload.status !== 'success') {
      return {
        success: false,
        error: 'Unexpected payment status'
      };
    }

    const successPayload = finalPayload as { transaction_id: string; reference: string };

    return {
      success: true,
      transactionId: successPayload.transaction_id,
      reference: successPayload.reference
    };
  } catch (error) {
    console.error('Error executing MiniKit payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment execution failed'
    };
  }
}

/**
 * Confirm payment status using transaction ID
 *
 * @param transactionId - Transaction ID from MiniKit
 * @param referenceId - Payment reference ID
 * @returns Promise with payment confirmation result
 */
export async function confirmPaymentStatus(
  transactionId: string,
  referenceId: string
): Promise<PaymentConfirmationResult> {
  try {
    // Query Worldcoin API for transaction status
    const statusResponse = await fetch(
      `https://developer.worldcoin.org/api/v2/minikit/transaction/${transactionId}?app_id=${process.env.NEXT_PUBLIC_WORLD_APP_ID}&type=payment`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.WORLD_VERIFY_API_KEY}`
        }
      }
    );

    if (!statusResponse.ok) {
      throw new Error(`Failed to check transaction status: ${statusResponse.status}`);
    }

    const transactionData = await statusResponse.json();

    let status: PaymentStatus;
    switch (transactionData.transaction_status) {
      case 'mined':
        status = 'completed';
        break;
      case 'pending':
        status = 'processing';
        break;
      case 'failed':
        status = 'failed';
        break;
      default:
        status = 'pending';
    }

    // Update payment record in database
    const updateResult = await withTransaction(async (client) => {
      // Update payment status
      const paymentUpdate = await client.query(
        `UPDATE payments
         SET status = $1,
             transaction_hash = $2,
             processed_at = CASE WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP ELSE processed_at END,
             failure_reason = CASE WHEN $1 = 'failed' THEN $3 ELSE failure_reason END
         WHERE external_payment_id = $4 OR id = $4
         RETURNING *`,
        [
          status,
          transactionData.transaction_hash || null,
          status === 'failed' ? 'Transaction failed on blockchain' : null,
          referenceId
        ]
      );

      if (paymentUpdate.rows.length === 0) {
        throw new Error('Payment record not found');
      }

      const payment = paymentUpdate.rows[0];

      // If payment is completed, update submission and user earnings
      if (status === 'completed' && payment.submission_id) {
        // Mark submission as paid
        await client.query(
          `UPDATE submissions SET is_paid = true WHERE id = $1`,
          [payment.submission_id]
        );

        // Update user total earnings
        await client.query(
          `UPDATE users
           SET total_earned = total_earned + $1
           WHERE id = $2`,
          [payment.net_amount, payment.recipient_id]
        );
      }

      return payment;
    });

    return {
      success: true,
      transactionHash: transactionData.transaction_hash,
      status,
      netAmount: updateResult.net_amount
    };
  } catch (error) {
    console.error('Error confirming payment status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to confirm payment status'
    };
  }
}

/**
 * Get payment history for a user
 *
 * @param userId - User ID
 * @param options - Query options
 * @returns Promise with payment history
 */
export async function getUserPaymentHistory(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    status?: PaymentStatus;
    type?: PaymentType;
  } = {}
): Promise<{ payments: Payment[]; total: number }> {
  try {
    const { limit = 50, offset = 0, status, type } = options;

    let whereClause = 'WHERE (payer_id = $1 OR recipient_id = $1)';
    const params: any[] = [userId];

    if (status) {
      params.push(status);
      whereClause += ` AND status = $${params.length}`;
    }

    if (type) {
      params.push(type);
      whereClause += ` AND payment_type = $${params.length}`;
    }

    // Get total count
    const countResult = await executeQuery<{ count: string }>(
      `SELECT COUNT(*) as count FROM payments ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0]?.count || '0');

    // Get payments
    const paymentsResult = await executeQuery<Payment>(
      `SELECT * FROM payments
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return {
      payments: paymentsResult.rows,
      total
    };
  } catch (error) {
    console.error('Error getting user payment history:', error);
    return { payments: [], total: 0 };
  }
}

/**
 * Get payment statistics for a user
 *
 * @param userId - User ID
 * @returns Promise with payment statistics
 */
export async function getUserPaymentStats(userId: string): Promise<{
  totalEarned: number;
  totalPaid: number;
  pendingPayments: number;
  completedPayments: number;
  averageEarning: number;
}> {
  try {
    const result = await executeQuery<{
      total_earned: string;
      total_paid: string;
      pending_payments: string;
      completed_payments: string;
      avg_earning: string;
    }>(
      `SELECT
         COALESCE(SUM(CASE WHEN recipient_id = $1 AND status = 'completed' THEN net_amount END), 0) as total_earned,
         COALESCE(SUM(CASE WHEN payer_id = $1 AND status = 'completed' THEN amount END), 0) as total_paid,
         COUNT(CASE WHEN recipient_id = $1 AND status IN ('pending', 'processing') THEN 1 END) as pending_payments,
         COUNT(CASE WHEN recipient_id = $1 AND status = 'completed' THEN 1 END) as completed_payments,
         COALESCE(AVG(CASE WHEN recipient_id = $1 AND status = 'completed' THEN net_amount END), 0) as avg_earning
       FROM payments
       WHERE recipient_id = $1 OR payer_id = $1`,
      [userId]
    );

    const stats = result.rows[0];

    return {
      totalEarned: parseFloat(stats?.total_earned || '0'),
      totalPaid: parseFloat(stats?.total_paid || '0'),
      pendingPayments: parseInt(stats?.pending_payments || '0'),
      completedPayments: parseInt(stats?.completed_payments || '0'),
      averageEarning: parseFloat(stats?.avg_earning || '0')
    };
  } catch (error) {
    console.error('Error getting user payment stats:', error);
    return {
      totalEarned: 0,
      totalPaid: 0,
      pendingPayments: 0,
      completedPayments: 0,
      averageEarning: 0
    };
  }
}

/**
 * Format currency amount for display
 *
 * @param amount - Amount to format
 * @param currency - Currency type
 * @param includeSymbol - Whether to include currency symbol
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  currency: RewardCurrency,
  includeSymbol: boolean = true
): string {
  const decimals = currency === 'WLD' ? 2 : currency === 'USDC' ? 2 : 4;

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(amount);

  return includeSymbol ? `${formatted} ${currency}` : formatted;
}

/**
 * Handle payment timeout and cleanup
 *
 * @returns Promise with number of expired payments cleaned up
 */
export async function cleanupExpiredPayments(): Promise<number> {
  try {
    const result = await executeQuery(
      `UPDATE payments
       SET status = 'failed',
           failure_reason = 'Payment expired'
       WHERE status = 'pending'
       AND expires_at < CURRENT_TIMESTAMP
       RETURNING id`
    );

    console.log(`Cleaned up ${result.rowCount} expired payments`);
    return result.rowCount;
  } catch (error) {
    console.error('Error cleaning up expired payments:', error);
    return 0;
  }
}

/**
 * Check MiniKit payment capability
 *
 * @returns Payment capability status
 */
export function checkPaymentCapability(): {
  available: boolean;
  supportedTokens: string[];
  error?: string;
} {
  try {
    if (!MiniKit.isInstalled()) {
      return {
        available: false,
        supportedTokens: [],
        error: 'MiniKit not available'
      };
    }

    const hasPayCommand = typeof MiniKit.commandsAsync?.pay === 'function';

    return {
      available: hasPayCommand,
      supportedTokens: hasPayCommand ? ['WLD', 'USDC', 'ETH'] : [],
      error: hasPayCommand ? undefined : 'Payment functionality not available'
    };
  } catch (error) {
    return {
      available: false,
      supportedTokens: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}