/**
 * Payment initiation API for WorldCoin integration
 * Handles payment requests for task rewards and escrow
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/session';
import { queries } from '@/lib/db';

interface PaymentRequest {
  task_id?: string;
  submission_id?: string;
  amount: number;
  currency?: string;
  payment_type: 'task_reward' | 'escrow_deposit' | 'escrow_release' | 'refund';
  recipient_id?: string;
  reference?: string;
}

export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const paymentData: PaymentRequest = await req.json();

      // Validate required fields
      if (!paymentData.amount || paymentData.amount <= 0) {
        return NextResponse.json(
          { error: 'Invalid payment amount' },
          { status: 400 }
        );
      }

      if (!paymentData.payment_type) {
        return NextResponse.json(
          { error: 'Payment type is required' },
          { status: 400 }
        );
      }

      // Generate payment ID
      const paymentId = crypto.randomUUID().replace(/-/g, '');

      // Validate based on payment type
      if (paymentData.payment_type === 'task_reward') {
        if (!paymentData.task_id || !paymentData.submission_id) {
          return NextResponse.json(
            { error: 'Task ID and Submission ID required for task rewards' },
            { status: 400 }
          );
        }

        // Verify task creator is making the payment
        const tasks = await queries.tasks.findById(paymentData.task_id);
        if (tasks.length === 0 || tasks[0].creator_id !== user.id) {
          return NextResponse.json(
            { error: 'Unauthorized: Only task creator can initiate reward payments' },
            { status: 403 }
          );
        }

        // Get submission details for recipient
        const { db } = await import('@/lib/db');
        const submissionQuery = `
          SELECT user_id FROM submissions WHERE id = $1 AND task_id = $2
        `;
        const submissions = await db(submissionQuery, [paymentData.submission_id, paymentData.task_id]);

        if (submissions.length === 0) {
          return NextResponse.json(
            { error: 'Submission not found' },
            { status: 404 }
          );
        }

        paymentData.recipient_id = submissions[0].user_id;
      }

      if (paymentData.payment_type === 'escrow_deposit') {
        if (!paymentData.task_id) {
          return NextResponse.json(
            { error: 'Task ID required for escrow deposits' },
            { status: 400 }
          );
        }
      }

      // Create payment record in database
      const newPayment = {
        task_id: paymentData.task_id || null,
        submission_id: paymentData.submission_id || null,
        payer_id: user.id,
        recipient_id: paymentData.recipient_id || null,
        amount: paymentData.amount,
        currency: paymentData.currency || 'WLD',
        payment_type: paymentData.payment_type,
        blockchain_network: 'optimism',
        external_payment_id: paymentId,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };

      const createdPayments = await queries.payments.create(newPayment);

      if (createdPayments.length === 0) {
        throw new Error('Failed to create payment record');
      }

      const payment = createdPayments[0];

      // Store the payment ID for verification
      // This ID will be used by WorldCoin to confirm the payment
      return NextResponse.json({
        success: true,
        id: paymentId, // WorldCoin external payment ID
        payment_id: payment.id, // Internal payment ID
        amount: payment.amount,
        currency: payment.currency,
        payment_type: payment.payment_type,
        status: payment.status,
        expires_at: payment.expires_at,
        reference: paymentData.reference || `Payment for ${payment.payment_type}`
      });

    } catch (error) {
      console.error('Payment initiation error:', error);
      return NextResponse.json(
        { error: 'Failed to initiate payment' },
        { status: 500 }
      );
    }
  });
}
