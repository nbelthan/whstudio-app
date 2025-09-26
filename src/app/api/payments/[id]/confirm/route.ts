/**
 * Payment confirmation API endpoint
 * Handles payment status updates from WorldCoin or manual confirmation
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/session';
import { queries } from '@/lib/db/client';

/**
 * Confirm payment completion (usually called by webhook or frontend after successful payment)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    try {
      const { id: paymentId } = await params;
      const confirmationData = await req.json();

      if (!paymentId || typeof paymentId !== 'string') {
        return NextResponse.json(
          { error: 'Invalid payment ID' },
          { status: 400 }
        );
      }

      const { transaction_hash, status, gas_fee, platform_fee, failure_reason } = confirmationData;

      // Validate status
      if (!status || !['completed', 'failed', 'cancelled'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid payment status' },
          { status: 400 }
        );
      }

      // Get payment details
      const { db } = await import('@/lib/db/client');

      const paymentQuery = `
        SELECT p.*, t.title as task_title
        FROM payments p
        LEFT JOIN tasks t ON p.task_id = t.id
        WHERE p.id = $1
      `;

      const payments = await db(paymentQuery, [paymentId]);

      if (payments.length === 0) {
        return NextResponse.json(
          { error: 'Payment not found' },
          { status: 404 }
        );
      }

      const payment = payments[0];

      // Verify user is authorized to confirm this payment
      if (payment.payer_id !== user.id && payment.recipient_id !== user.id) {
        return NextResponse.json(
          { error: 'Unauthorized to confirm this payment' },
          { status: 403 }
        );
      }

      // Check if payment is in a confirmable state
      if (payment.status === 'completed' || payment.status === 'failed') {
        return NextResponse.json(
          { error: 'Payment has already been finalized' },
          { status: 409 }
        );
      }

      // Calculate net amount if completed
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
        paymentId
      ]);

      if (updatedPayments.length === 0) {
        throw new Error('Failed to update payment');
      }

      const updatedPayment = updatedPayments[0];

      // If payment is completed and it's a task reward, mark submission as paid
      if (status === 'completed' && payment.payment_type === 'task_reward' && payment.submission_id) {
        try {
          const submissionUpdateQuery = `
            UPDATE submissions
            SET is_paid = true, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `;
          await db(submissionUpdateQuery, [payment.submission_id]);

          // Update user's total earned
          if (payment.recipient_id) {
            const userUpdateQuery = `
              UPDATE users
              SET total_earned = total_earned + $1, updated_at = CURRENT_TIMESTAMP
              WHERE id = $2
            `;
            await db(userUpdateQuery, [netAmount, payment.recipient_id]);
          }
        } catch (updateError) {
          console.error('Error updating related records:', updateError);
          // Don't fail the payment confirmation if these updates fail
        }
      }

      // TODO: Send notification to relevant parties
      // TODO: Update reputation scores if applicable

      const responseData = {
        id: updatedPayment.id,
        task_id: updatedPayment.task_id,
        submission_id: updatedPayment.submission_id,
        amount: updatedPayment.amount,
        currency: updatedPayment.currency,
        payment_type: updatedPayment.payment_type,
        status: updatedPayment.status,
        transaction_hash: updatedPayment.transaction_hash,
        gas_fee: updatedPayment.gas_fee,
        platform_fee: updatedPayment.platform_fee,
        net_amount: updatedPayment.net_amount,
        failure_reason: updatedPayment.failure_reason,
        processed_at: updatedPayment.processed_at,
        updated_at: updatedPayment.updated_at
      };

      return NextResponse.json({
        success: true,
        payment: responseData,
        message: `Payment ${status} successfully`
      });

    } catch (error) {
      console.error('Payment confirmation error:', error);
      return NextResponse.json(
        { error: 'Failed to confirm payment' },
        { status: 500 }
      );
    }
  });
}

/**
 * Get payment confirmation status
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    try {
      const { id: paymentId } = await params;

      if (!paymentId || typeof paymentId !== 'string') {
        return NextResponse.json(
          { error: 'Invalid payment ID' },
          { status: 400 }
        );
      }

      // Get payment status
      const { db } = await import('@/lib/db/client');

      const query = `
        SELECT p.*, t.title as task_title, u.username as recipient_username
        FROM payments p
        LEFT JOIN tasks t ON p.task_id = t.id
        LEFT JOIN users u ON p.recipient_id = u.id
        WHERE p.id = $1
      `;

      const payments = await db(query, [paymentId]);

      if (payments.length === 0) {
        return NextResponse.json(
          { error: 'Payment not found' },
          { status: 404 }
        );
      }

      const payment = payments[0];

      // Check permissions
      if (payment.payer_id !== user.id && payment.recipient_id !== user.id) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }

      const paymentData = {
        id: payment.id,
        task_title: payment.task_title,
        recipient_username: payment.recipient_username,
        amount: payment.amount,
        currency: payment.currency,
        payment_type: payment.payment_type,
        status: payment.status,
        transaction_hash: payment.transaction_hash,
        blockchain_network: payment.blockchain_network,
        gas_fee: payment.gas_fee,
        platform_fee: payment.platform_fee,
        net_amount: payment.net_amount,
        external_payment_id: payment.external_payment_id,
        failure_reason: payment.failure_reason,
        processed_at: payment.processed_at,
        expires_at: payment.expires_at,
        created_at: payment.created_at,
        is_payer: payment.payer_id === user.id,
        is_recipient: payment.recipient_id === user.id
      };

      return NextResponse.json({
        success: true,
        payment: paymentData
      });

    } catch (error) {
      console.error('Payment status error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch payment status' },
        { status: 500 }
      );
    }
  });
}