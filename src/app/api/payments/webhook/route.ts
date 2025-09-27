/**
 * Payment webhook endpoint for WorldCoin payment confirmations
 * Handles payment status updates from external payment providers
 */

import { NextRequest, NextResponse } from 'next/server';
import { queries } from '@/lib/db';

/**
 * Handle payment webhooks from WorldCoin or other payment providers
 */
export async function POST(req: NextRequest) {
  try {
    const webhookData = await req.json();

    // Verify webhook signature (implement based on your payment provider's requirements)
    const isValidWebhook = await verifyWebhookSignature(req, webhookData);

    if (!isValidWebhook) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    const { external_payment_id, status, transaction_hash, gas_fee, platform_fee, failure_reason } = webhookData;

    if (!external_payment_id) {
      return NextResponse.json(
        { error: 'Missing external payment ID' },
        { status: 400 }
      );
    }

    // Find payment by external ID
    const { db } = await import('@/lib/db');

    const findPaymentQuery = `
      SELECT * FROM payments WHERE external_payment_id = $1
    `;

    const payments = await db(findPaymentQuery, [external_payment_id]);

    if (payments.length === 0) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    const payment = payments[0];

    // Check if payment is already finalized
    if (payment.status === 'completed' || payment.status === 'failed') {
      return NextResponse.json({
        success: true,
        message: 'Payment already finalized'
      });
    }

    // Calculate net amount
    let netAmount = payment.amount;
    if (status === 'completed' && (gas_fee || platform_fee)) {
      netAmount = payment.amount - (gas_fee || 0) - (platform_fee || 0);
    }

    // Update payment status
    const updateQuery = `
      UPDATE payments
      SET
        status = $1,
        transaction_hash = COALESCE($2, transaction_hash),
        gas_fee = COALESCE($3, gas_fee),
        platform_fee = COALESCE($4, platform_fee),
        net_amount = $5,
        failure_reason = COALESCE($6, failure_reason),
        processed_at = CASE WHEN $1 IN ('completed', 'failed') THEN CURRENT_TIMESTAMP ELSE processed_at END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;

    const updatedPayments = await db(updateQuery, [
      status,
      transaction_hash,
      gas_fee,
      platform_fee,
      netAmount,
      failure_reason,
      payment.id
    ]);

    if (updatedPayments.length === 0) {
      throw new Error('Failed to update payment');
    }

    // Handle successful payment completion
    if (status === 'completed') {
      await handlePaymentSuccess(payment, netAmount, db);
    }

    // Handle failed payments
    if (status === 'failed') {
      await handlePaymentFailure(payment, failure_reason, db);
    }

    return NextResponse.json({
      success: true,
      message: `Payment ${status} processed successfully`
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

/**
 * Verify webhook signature for security
 */
async function verifyWebhookSignature(req: NextRequest, webhookData: any): Promise<boolean> {
  // This is a placeholder implementation
  // In production, implement proper signature verification based on your payment provider

  const signature = req.headers.get('x-webhook-signature');
  const timestamp = req.headers.get('x-webhook-timestamp');

  // Basic validation - in production, use cryptographic verification
  if (!signature || !timestamp) {
    return false;
  }

  // Check timestamp to prevent replay attacks (within 5 minutes)
  const webhookTime = parseInt(timestamp);
  const currentTime = Math.floor(Date.now() / 1000);
  if (currentTime - webhookTime > 300) {
    return false;
  }

  // TODO: Implement proper HMAC signature verification
  // Example: compare signature with HMAC-SHA256(webhook_secret, payload + timestamp)

  return true; // Placeholder - implement proper verification
}

/**
 * Handle successful payment completion
 */
async function handlePaymentSuccess(payment: any, netAmount: number, db: any): Promise<void> {
  try {
    // If it's a task reward, update submission and user earnings
    if (payment.payment_type === 'task_reward' && payment.submission_id) {
      // Mark submission as paid
      await db(`
        UPDATE submissions
        SET is_paid = true, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [payment.submission_id]);

      // Update recipient's total earnings
      if (payment.recipient_id) {
        await db(`
          UPDATE users
          SET
            total_earned = total_earned + $1,
            reputation_score = reputation_score + 1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [netAmount, payment.recipient_id]);
      }
    }

    // If it's escrow release, handle escrow completion
    if (payment.payment_type === 'escrow_release' && payment.task_id) {
      await db(`
        UPDATE tasks
        SET status = 'completed', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [payment.task_id]);
    }

    // TODO: Send success notification to user(s)
    // TODO: Update analytics/metrics

  } catch (error) {
    console.error('Error handling payment success:', error);
    // Log error but don't throw - webhook should still return success
  }
}

/**
 * Handle payment failure
 */
async function handlePaymentFailure(payment: any, failureReason: string, db: any): Promise<void> {
  try {
    // If it's a task reward failure, revert submission status
    if (payment.payment_type === 'task_reward' && payment.submission_id) {
      await db(`
        UPDATE submissions
        SET is_paid = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [payment.submission_id]);
    }

    // TODO: Send failure notification to user(s)
    // TODO: Handle refunds if necessary
    // TODO: Update dispute records if applicable

  } catch (error) {
    console.error('Error handling payment failure:', error);
    // Log error but don't throw - webhook should still return success
  }
}