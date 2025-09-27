/**
 * Payment Initiation endpoint
 * Initiates payments using MiniKit for task rewards and escrow operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, withTransaction } from '@/lib/db';
import { requireAuth } from '@/lib/session';
import { initiateTaskPayment, createPaymentRecord, validatePaymentAmount, convertToTokenDecimals } from '@/lib/payment';

// Use Edge Runtime for faster cold starts
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

interface InitiatePaymentRequest {
  submission_id?: string;
  task_id?: string;
  recipient_id?: string;
  amount?: number;
  currency?: 'WLD' | 'ETH' | 'USDC';
  payment_type: 'task_reward' | 'escrow_deposit' | 'escrow_release' | 'refund';
  description?: string;
  recipient_address?: string;
}

/**
 * Initiate payment for task reward or escrow operation
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const {
      submission_id,
      task_id,
      recipient_id,
      amount,
      currency = 'WLD',
      payment_type,
      description,
      recipient_address
    }: InitiatePaymentRequest = await req.json();

    // Validate required fields
    if (!payment_type) {
      return NextResponse.json(
        { error: 'payment_type is required' },
        { status: 400 }
      );
    }

    // Validate payment type
    const validPaymentTypes = ['task_reward', 'escrow_deposit', 'escrow_release', 'refund'];
    if (!validPaymentTypes.includes(payment_type)) {
      return NextResponse.json(
        { error: 'Invalid payment_type' },
        { status: 400 }
      );
    }

    // Get user details
    const userResult = await executeQuery<{
      id: string;
      wallet_address: string;
      is_active: boolean;
    }>(
      `SELECT id, wallet_address, is_active
       FROM users
       WHERE nullifier_hash = $1
       LIMIT 1`,
      [session.nullifierHash]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // Handle different payment types
    if (payment_type === 'task_reward') {
      // Task reward payment requires submission_id
      if (!submission_id) {
        return NextResponse.json(
          { error: 'submission_id is required for task reward payments' },
          { status: 400 }
        );
      }

      // Use the payment library function for task payments
      const paymentResult = await initiateTaskPayment(submission_id, recipient_address);

      if (!paymentResult.success) {
        return NextResponse.json(
          { error: paymentResult.error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        payment: {
          id: paymentResult.paymentId,
          reference_id: paymentResult.referenceId,
          amount: paymentResult.amount,
          token: paymentResult.token,
          to: paymentResult.to,
          payment_type: 'task_reward'
        },
        minikit_payload: {
          reference: paymentResult.referenceId,
          to: paymentResult.to,
          tokens: [{
            symbol: paymentResult.token,
            token_amount: paymentResult.amount
          }],
          description: description || 'WorldHuman Studio Task Reward'
        }
      });
    }

    // For other payment types, use manual flow
    if (!task_id || !recipient_id || !amount) {
      return NextResponse.json(
        { error: 'task_id, recipient_id, and amount are required for this payment type' },
        { status: 400 }
      );
    }

    // Validate payment amount
    const amountValidation = validatePaymentAmount(amount, currency);
    if (!amountValidation.valid) {
      return NextResponse.json(
        { error: amountValidation.error },
        { status: 400 }
      );
    }

    // Use transaction for data consistency
    const result = await withTransaction(async (client) => {
      // Get task details
      const taskResult = await client.query(
        `SELECT
           id, title, creator_id, reward_amount, reward_currency,
           status, max_submissions
         FROM tasks
         WHERE id = $1`,
        [task_id]
      );

      if (taskResult.rows.length === 0) {
        throw new Error('Task not found');
      }

      const task = taskResult.rows[0];

      // Validate user permissions based on payment type
      if (payment_type === 'escrow_deposit') {
        // Only task creator can make escrow deposits
        if (task.creator_id !== user.id) {
          throw new Error('Only task creator can make escrow deposits');
        }
      } else if (payment_type === 'escrow_release' || payment_type === 'refund') {
        // Only task creator can release escrow or issue refunds
        if (task.creator_id !== user.id) {
          throw new Error('Only task creator can release escrow or issue refunds');
        }
      }

      // Get recipient details
      const recipientResult = await client.query(
        `SELECT id, wallet_address, username FROM users WHERE id = $1 AND is_active = true`,
        [recipient_id]
      );

      if (recipientResult.rows.length === 0) {
        throw new Error('Recipient not found');
      }

      const recipient = recipientResult.rows[0];
      const recipientWallet = recipient_address || recipient.wallet_address;

      if (!recipientWallet) {
        throw new Error('Recipient wallet address not found');
      }

      // Check daily payment limit (prevent abuse)
      const dailyPayments = await client.query(
        `SELECT COUNT(*) as count, SUM(amount) as total_amount
         FROM payments
         WHERE payer_id = $1
         AND created_at >= CURRENT_DATE
         AND status IN ('pending', 'processing', 'completed')`,
        [user.id]
      );

      const dailyStats = dailyPayments.rows[0];
      const dailyCount = parseInt(dailyStats?.count || '0');
      const dailyTotal = parseFloat(dailyStats?.total_amount || '0');

      if (dailyCount >= 100) {
        throw new Error('Daily payment limit (100 transactions) exceeded');
      }

      if (dailyTotal + amount > 10000) { // $10,000 daily limit
        throw new Error('Daily payment amount limit ($10,000) exceeded');
      }

      // Create payment record
      const payment = await createPaymentRecord({
        taskId: task_id,
        submissionId: submission_id || undefined,
        payerId: user.id,
        recipientId: recipient_id,
        amount,
        currency,
        paymentType: payment_type
      });

      // Convert amount to token decimals for MiniKit
      const tokenAmount = convertToTokenDecimals(amount, currency);

      return {
        payment,
        task: {
          id: task.id,
          title: task.title
        },
        recipient: {
          id: recipient.id,
          username: recipient.username,
          wallet_address: recipientWallet
        },
        token_amount: tokenAmount
      };
    });

    return NextResponse.json({
      success: true,
      payment: {
        id: result.payment.id,
        reference_id: result.payment.external_payment_id || result.payment.id,
        amount: result.token_amount,
        token: currency,
        to: result.recipient.wallet_address,
        payment_type,
        expires_at: result.payment.expires_at
      },
      task: {
        id: result.task.id,
        title: result.task.title
      },
      recipient: {
        id: result.recipient.id,
        username: result.recipient.username
      },
      minikit_payload: {
        reference: result.payment.external_payment_id || result.payment.id,
        to: result.recipient.wallet_address,
        tokens: [{
          symbol: currency,
          token_amount: result.token_amount
        }],
        description: description || `${payment_type.replace('_', ' ')} for ${result.task.title}`
      }
    });

  } catch (error) {
    console.error('Payment initiation error:', error);

    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      if ([
        'Task not found',
        'Recipient not found',
        'Only task creator can make escrow deposits',
        'Only task creator can release escrow or issue refunds',
        'Recipient wallet address not found',
        'Daily payment limit (100 transactions) exceeded',
        'Daily payment amount limit ($10,000) exceeded'
      ].includes(error.message)) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to initiate payment' },
      { status: 500 }
    );
  }
}

/**
 * Get payment initiation status and available options
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);
    const task_id = searchParams.get('task_id');
    const submission_id = searchParams.get('submission_id');

    if (!task_id && !submission_id) {
      return NextResponse.json(
        { error: 'Either task_id or submission_id is required' },
        { status: 400 }
      );
    }

    // Get user details
    const userResult = await executeQuery<{
      id: string;
      wallet_address: string;
      verification_level: string;
    }>(
      `SELECT id, wallet_address, verification_level
       FROM users
       WHERE nullifier_hash = $1 AND is_active = true
       LIMIT 1`,
      [session.nullifierHash]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    let paymentOptions: any = {
      available_payment_types: [],
      user_capabilities: {
        can_pay: !!user.wallet_address,
        verification_level: user.verification_level,
        wallet_connected: !!user.wallet_address
      }
    };

    // If task_id is provided, get task details and available actions
    if (task_id) {
      const taskResult = await executeQuery<{
        id: string;
        title: string;
        creator_id: string;
        reward_amount: number;
        reward_currency: string;
        status: string;
      }>(
        `SELECT id, title, creator_id, reward_amount, reward_currency, status
         FROM tasks
         WHERE id = $1`,
        [task_id]
      );

      if (taskResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        );
      }

      const task = taskResult.rows[0];
      const isCreator = task.creator_id === user.id;

      paymentOptions.task = {
        id: task.id,
        title: task.title,
        reward_amount: task.reward_amount,
        reward_currency: task.reward_currency,
        is_creator: isCreator
      };

      // Available payment types based on user role
      if (isCreator) {
        paymentOptions.available_payment_types.push('escrow_deposit');

        // Check if there are pending submissions that can be paid
        const pendingSubmissions = await executeQuery<{ count: string }>(
          `SELECT COUNT(*) as count FROM submissions
           WHERE task_id = $1 AND status = 'approved' AND is_paid = false`,
          [task_id]
        );

        if (parseInt(pendingSubmissions.rows[0]?.count || '0') > 0) {
          paymentOptions.available_payment_types.push('task_reward');
        }

        // Check if there are escrow funds to release or refund
        const escrowFunds = await executeQuery<{ count: string }>(
          `SELECT COUNT(*) as count FROM payments
           WHERE task_id = $1 AND payment_type = 'escrow_deposit' AND status = 'completed'`,
          [task_id]
        );

        if (parseInt(escrowFunds.rows[0]?.count || '0') > 0) {
          paymentOptions.available_payment_types.push('escrow_release', 'refund');
        }
      }
    }

    // If submission_id is provided, get submission details
    if (submission_id) {
      const submissionResult = await executeQuery<{
        id: string;
        task_id: string;
        user_id: string;
        status: string;
        is_paid: boolean;
        task_title: string;
        task_creator_id: string;
        reward_amount: number;
        reward_currency: string;
      }>(
        `SELECT
           s.id, s.task_id, s.user_id, s.status, s.is_paid,
           t.title as task_title, t.creator_id as task_creator_id,
           t.reward_amount, t.reward_currency
         FROM submissions s
         JOIN tasks t ON s.task_id = t.id
         WHERE s.id = $1`,
        [submission_id]
      );

      if (submissionResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Submission not found' },
          { status: 404 }
        );
      }

      const submission = submissionResult.rows[0];
      const isTaskCreator = submission.task_creator_id === user.id;

      paymentOptions.submission = {
        id: submission.id,
        task_id: submission.task_id,
        task_title: submission.task_title,
        status: submission.status,
        is_paid: submission.is_paid,
        reward_amount: submission.reward_amount,
        reward_currency: submission.reward_currency,
        can_pay: isTaskCreator && submission.status === 'approved' && !submission.is_paid
      };

      if (isTaskCreator && submission.status === 'approved' && !submission.is_paid) {
        paymentOptions.available_payment_types.push('task_reward');
      }
    }

    // Get user's payment history for context
    const recentPayments = await executeQuery<{ count: string; total_amount: string }>(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount
       FROM payments
       WHERE payer_id = $1 AND created_at >= CURRENT_DATE`,
      [user.id]
    );

    const dailyStats = recentPayments.rows[0];
    paymentOptions.user_limits = {
      daily_transactions: parseInt(dailyStats?.count || '0'),
      daily_amount: parseFloat(dailyStats?.total_amount || '0'),
      daily_transaction_limit: 100,
      daily_amount_limit: 10000,
      remaining_transactions: Math.max(0, 100 - parseInt(dailyStats?.count || '0')),
      remaining_amount: Math.max(0, 10000 - parseFloat(dailyStats?.total_amount || '0'))
    };

    return NextResponse.json({
      success: true,
      payment_options: paymentOptions
    });

  } catch (error) {
    console.error('Payment options error:', error);
    return NextResponse.json(
      { error: 'Failed to get payment options' },
      { status: 500 }
    );
  }
}