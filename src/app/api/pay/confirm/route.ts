/**
 * Payment Confirmation endpoint
 * Confirms payment transactions and updates payment status with retry logic
 */

import { NextRequest, NextResponse } from 'next/server';
import { withTransaction } from '@/lib/db';
import { confirmPaymentStatus } from '@/lib/payment';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // Allow more time for blockchain verification

interface ConfirmPaymentRequest {
  reference_id: string;
  transaction_id: string;
  submission_id?: string;
}

/**
 * Confirm payment transaction and update status
 */
export async function POST(req: NextRequest) {
  try {
    const {
      reference_id,
      transaction_id,
      submission_id
    }: ConfirmPaymentRequest = await req.json();

    // Validate required fields
    if (!reference_id || !transaction_id) {
      return NextResponse.json(
        { error: 'reference_id and transaction_id are required' },
        { status: 400 }
      );
    }

    // Validate transaction_id format (basic hex check)
    if (!/^0x[a-fA-F0-9]{64}$/.test(transaction_id)) {
      return NextResponse.json(
        { error: 'Invalid transaction_id format' },
        { status: 400 }
      );
    }

    // Update payment status with transaction hash
    const result = await confirmPaymentStatus(reference_id, transaction_id);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to update payment status' },
        { status: 400 }
      );
    }

    // Get additional payment details
    const paymentQuery = `
      SELECT
        p.id, p.task_id, p.submission_id, p.payer_id, p.recipient_id,
        p.amount, p.currency, p.payment_type, p.status, p.transaction_hash,
        p.net_amount, p.platform_fee, p.created_at, p.processed_at
      FROM payments p
      WHERE p.external_payment_id = $1 OR p.id = $1
      LIMIT 1
    `;

    const paymentResult = await db(paymentQuery, [reference_id]);

    if (paymentResult.length === 0) {
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      );
    }

    const payment = paymentResult[0];

    // Get task and user details for context
    const contextResult = await executeQuery<{
      task_title: string;
      payer_username: string;
      recipient_username: string;
      recipient_wallet: string;
    }>(
      `SELECT
         t.title as task_title,
         payer.username as payer_username,
         recipient.username as recipient_username,
         recipient.wallet_address as recipient_wallet
       FROM payments p
       JOIN tasks t ON p.task_id = t.id
       LEFT JOIN users payer ON p.payer_id = payer.id
       LEFT JOIN users recipient ON p.recipient_id = recipient.id
       WHERE p.id = $1`,
      [payment.id]
    );

    const context = contextResult.rows[0];

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        reference_id: reference_id,
        transaction_id: transaction_id,
        transaction_hash: confirmationResult.transactionHash,
        status: confirmationResult.status,
        amount: payment.amount,
        currency: payment.currency,
        net_amount: confirmationResult.netAmount || payment.net_amount,
        platform_fee: payment.platform_fee,
        payment_type: payment.payment_type,
        processed_at: payment.processed_at
      },
      task: {
        id: payment.task_id,
        title: context?.task_title
      },
      parties: {
        payer: {
          id: payment.payer_id,
          username: context?.payer_username
        },
        recipient: {
          id: payment.recipient_id,
          username: context?.recipient_username,
          wallet_address: context?.recipient_wallet
        }
      },
      blockchain: {
        transaction_hash: confirmationResult.transactionHash,
        status: confirmationResult.status,
        network: 'world-chain'
      }
    });

  } catch (error) {
    console.error('Payment confirmation error:', error);
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}

/**
 * Get payment status by reference ID or transaction ID
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const reference_id = searchParams.get('reference_id');
    const transaction_id = searchParams.get('transaction_id');

    if (!reference_id && !transaction_id) {
      return NextResponse.json(
        { error: 'Either reference_id or transaction_id is required' },
        { status: 400 }
      );
    }

    // Build query based on available parameters
    let whereClause: string;
    let queryParams: string[];

    if (reference_id && transaction_id) {
      whereClause = '(p.external_payment_id = $1 OR p.id = $1) AND p.transaction_hash = $2';
      queryParams = [reference_id, transaction_id];
    } else if (reference_id) {
      whereClause = 'p.external_payment_id = $1 OR p.id = $1';
      queryParams = [reference_id];
    } else {
      whereClause = 'p.transaction_hash = $1';
      queryParams = [transaction_id!];
    }

    // Get payment details
    const paymentResult = await executeQuery<{
      id: string;
      task_id: string;
      submission_id: string;
      payer_id: string;
      recipient_id: string;
      amount: number;
      currency: string;
      payment_type: string;
      status: string;
      transaction_hash: string;
      external_payment_id: string;
      net_amount: number;
      platform_fee: number;
      failure_reason: string;
      created_at: string;
      processed_at: string;
      expires_at: string;
      task_title: string;
      payer_username: string;
      recipient_username: string;
    }>(
      `SELECT
         p.id, p.task_id, p.submission_id, p.payer_id, p.recipient_id,
         p.amount, p.currency, p.payment_type, p.status, p.transaction_hash,
         p.external_payment_id, p.net_amount, p.platform_fee, p.failure_reason,
         p.created_at, p.processed_at, p.expires_at,
         t.title as task_title,
         payer.username as payer_username,
         recipient.username as recipient_username
       FROM payments p
       JOIN tasks t ON p.task_id = t.id
       LEFT JOIN users payer ON p.payer_id = payer.id
       LEFT JOIN users recipient ON p.recipient_id = recipient.id
       WHERE ${whereClause}
       LIMIT 1`,
      queryParams
    );

    if (paymentResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    const payment = paymentResult.rows[0];

    // Check if payment is expired
    const isExpired = payment.expires_at && new Date(payment.expires_at) < new Date();

    // Get submission details if submission_id exists
    let submissionDetails = null;
    if (payment.submission_id) {
      const submissionResult = await executeQuery<{
        id: string;
        status: string;
        is_paid: boolean;
        quality_score: number;
        time_spent_minutes: number;
      }>(
        `SELECT id, status, is_paid, quality_score, time_spent_minutes
         FROM submissions
         WHERE id = $1`,
        [payment.submission_id]
      );

      if (submissionResult.rows.length > 0) {
        submissionDetails = submissionResult.rows[0];
      }
    }

    // Determine next actions based on payment status
    let nextActions = [];
    if (payment.status === 'pending') {
      if (isExpired) {
        nextActions.push('Payment has expired. Create a new payment.');
      } else {
        nextActions.push('Waiting for transaction confirmation');
        if (payment.transaction_hash) {
          nextActions.push('Check blockchain explorer for transaction status');
        }
      }
    } else if (payment.status === 'processing') {
      nextActions.push('Payment is being processed on the blockchain');
    } else if (payment.status === 'completed') {
      nextActions.push('Payment completed successfully');
      if (payment.payment_type === 'task_reward' && submissionDetails) {
        nextActions.push('Submission has been paid');
      }
    } else if (payment.status === 'failed') {
      nextActions.push('Payment failed. You can try creating a new payment.');
      if (payment.failure_reason) {
        nextActions.push(`Reason: ${payment.failure_reason}`);
      }
    }

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        reference_id: payment.external_payment_id || payment.id,
        transaction_hash: payment.transaction_hash,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        net_amount: payment.net_amount,
        platform_fee: payment.platform_fee,
        payment_type: payment.payment_type,
        failure_reason: payment.failure_reason,
        created_at: payment.created_at,
        processed_at: payment.processed_at,
        expires_at: payment.expires_at,
        is_expired: isExpired
      },
      task: {
        id: payment.task_id,
        title: payment.task_title
      },
      parties: {
        payer: {
          id: payment.payer_id,
          username: payment.payer_username
        },
        recipient: {
          id: payment.recipient_id,
          username: payment.recipient_username
        }
      },
      submission: submissionDetails,
      next_actions: nextActions,
      blockchain_info: payment.transaction_hash ? {
        transaction_hash: payment.transaction_hash,
        network: 'world-chain',
        explorer_url: `https://worldchain.org/tx/${payment.transaction_hash}`
      } : null
    });

  } catch (error) {
    console.error('Payment status check error:', error);
    return NextResponse.json(
      { error: 'Failed to get payment status' },
      { status: 500 }
    );
  }
}

/**
 * Retry payment confirmation with exponential backoff
 */
export async function PATCH(req: NextRequest) {
  try {
    const { reference_id, max_retries = 3 } = await req.json();

    if (!reference_id) {
      return NextResponse.json(
        { error: 'reference_id is required' },
        { status: 400 }
      );
    }

    // Get payment details
    const paymentResult = await executeQuery<{
      id: string;
      transaction_hash: string;
      status: string;
      created_at: string;
    }>(
      `SELECT id, transaction_hash, status, created_at
       FROM payments
       WHERE external_payment_id = $1 OR id = $1
       LIMIT 1`,
      [reference_id]
    );

    if (paymentResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    const payment = paymentResult.rows[0];

    // Only retry payments in certain states
    if (!['pending', 'processing'].includes(payment.status)) {
      return NextResponse.json(
        {
          error: 'Payment cannot be retried in current status',
          current_status: payment.status
        },
        { status: 400 }
      );
    }

    if (!payment.transaction_hash) {
      return NextResponse.json(
        { error: 'No transaction hash available for retry' },
        { status: 400 }
      );
    }

    // Implement retry logic with exponential backoff
    let lastError: string | undefined;
    let retryCount = 0;

    while (retryCount < max_retries) {
      try {
        // Wait before retry (exponential backoff: 1s, 2s, 4s, ...)
        if (retryCount > 0) {
          const delayMs = Math.pow(2, retryCount - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        // Attempt confirmation
        const confirmationResult = await confirmPaymentStatus(
          payment.transaction_hash,
          reference_id
        );

        if (confirmationResult.success) {
          return NextResponse.json({
            success: true,
            payment_status: confirmationResult.status,
            transaction_hash: confirmationResult.transactionHash,
            net_amount: confirmationResult.netAmount,
            retry_count: retryCount,
            message: 'Payment confirmation successful after retry'
          });
        }

        lastError = confirmationResult.error;
        retryCount++;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        retryCount++;
      }
    }

    // All retries failed
    return NextResponse.json(
      {
        error: 'Payment confirmation failed after all retries',
        last_error: lastError,
        retry_count: retryCount,
        max_retries
      },
      { status: 400 }
    );

  } catch (error) {
    console.error('Payment retry error:', error);
    return NextResponse.json(
      { error: 'Failed to retry payment confirmation' },
      { status: 500 }
    );
  }
}